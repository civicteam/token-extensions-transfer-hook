use std::rc::Rc;
use solana_clap_v3_utils::input_parsers::parse_url_or_moniker;
use solana_sdk::instruction::{AccountMeta, Instruction};
use solana_sdk::pubkey::Pubkey;
use solana_sdk::{system_instruction, system_program};
use spl_transfer_hook_interface::get_extra_account_metas_address_and_bump_seed;
use civic_transfer_hook;
use {
    clap::{crate_description, crate_name, crate_version, Arg, Command},
    solana_clap_v3_utils::{
        input_parsers::pubkey_of,
        input_validators::{
            is_valid_pubkey, is_valid_signer, normalize_to_url_if_moniker,
        },
        keypair::DefaultSigner,
    },
    solana_client::{
        nonblocking::rpc_client::RpcClient,
    },
    solana_remote_wallet::remote_wallet::RemoteWalletManager,
    solana_sdk::{
        commitment_config::CommitmentConfig,
        message::Message,
        signature::{Signature, Signer},
        transaction::Transaction,
    },
    std::process::exit,
};
use civic_transfer_hook::instruction::CivicTransferHookInstruction;

struct Config {
    commitment_config: CommitmentConfig,
    default_signer: Box<dyn Signer>,
    json_rpc_url: String,
    verbose: bool,
    websocket_url: String,
}

pub fn get_extra_account_metas_address(mint: &Pubkey) -> Pubkey {
    let ( address, _) = get_extra_account_metas_address_and_bump_seed(
        mint,
        &civic_transfer_hook::id(),
    );
    address
}

pub fn initialize_extra_account_meta(
    mint: &Pubkey,
    mint_authority: &Pubkey,
    gatekeeper_network: &Pubkey
) -> Instruction {
    let extra_account_metas_pubkey = get_extra_account_metas_address(mint);
    let account_metas = vec![
        AccountMeta::new(extra_account_metas_pubkey, false),
        AccountMeta::new_readonly(*mint, false),
        AccountMeta::new_readonly(*mint_authority, true),
        AccountMeta::new_readonly(system_program::id(), false),
    ];
    let data = CivicTransferHookInstruction::InitializeExtraAccountMetas {
        gatekeeper_network: *gatekeeper_network
    }.pack();
    Instruction::new_with_bytes(
        civic_transfer_hook::id(),
        &data,
        account_metas,
    )
}

async fn process_initialize_extra_account_metas(
    rpc_client: &RpcClient,
    signer: &dyn Signer,
    mint: &Pubkey,
    gatekeeper_network: &Pubkey
) -> Result<Signature, Box<dyn std::error::Error>> {
    let rent_lamports = rpc_client.get_minimum_balance_for_rent_exemption(121 /* TODO derive dynamically */).await?;
    let mut transaction = Transaction::new_unsigned(Message::new(
        &[
            system_instruction::transfer(
                &signer.pubkey(),
                &get_extra_account_metas_address(mint),
                rent_lamports,
            ),
            initialize_extra_account_meta(
            mint,
            &signer.pubkey(),
            gatekeeper_network
        )],
        Some(&signer.pubkey()),
    ));

    let blockhash = rpc_client
        .get_latest_blockhash()
        .await
        .map_err(|err| format!("error: unable to get latest blockhash: {err}"))?;

    transaction
        .try_sign(&vec![signer], blockhash)
        .map_err(|err| format!("error: failed to sign transaction: {err}"))?;

    // let res = rpc_client.simulate_transaction(&transaction).await.map_err(|err| format!("error: simulation failure: {err}"))?;
    // if res.value.err.is_some() {
    //     println!("error: simulation failure: {:?}", res.value.logs);
    // }
    // println!("Simulation passed");

    let signature = rpc_client
        .send_and_confirm_transaction_with_spinner(&transaction)
        .await
        .map_err(|err| format!("error: send transaction: {err}"))?;

    Ok(signature)
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let app_matches = Command::new(crate_name!())
        .about(crate_description!())
        .version(crate_version!())
        .subcommand_required(true)
        .arg_required_else_help(true)
        .arg({
            let arg = Arg::new("config_file")
                .short('C')
                .long("config")
                .value_name("PATH")
                .takes_value(true)
                .global(true)
                .help("Configuration file to use");
            if let Some(ref config_file) = *solana_cli_config::CONFIG_FILE {
                arg.default_value(config_file)
            } else {
                arg
            }
        })
        .arg(
            Arg::new("keypair")
                .long("keypair")
                .value_name("KEYPAIR")
                .validator(|s| is_valid_signer(s))
                .takes_value(true)
                .global(true)
                .help("Filepath or URL to a keypair [default: client keypair]"),
        )
        .arg(
            Arg::new("verbose")
                .long("verbose")
                .short('v')
                .takes_value(false)
                .global(true)
                .help("Show additional information"),
        )
        .arg(
            Arg::new("json_rpc_url")
                .short('u')
                .long("url")
                .value_name("URL")
                .takes_value(true)
                .global(true)
                .validator(|s| parse_url_or_moniker(s))
                .help("JSON RPC URL for the cluster [default: value from configuration file]"),
        )
        .subcommand(
            Command::new("set").about("Set the gatekeeper network of a permissioned token").arg(
                Arg::new("mint")
                    .validator(|s| is_valid_pubkey(s))
                    .value_name("MINT")
                    .takes_value(true)
                    .index(1)
                    .help("The token mint"),
            ).arg(
                Arg::new("gatekeeper network")
                    .validator(|s| is_valid_pubkey(s))
                    .value_name("GATEKEEPER_NETWORK")
                    .takes_value(true)
                    .index(2)
                    .help("The gatekeeper network address to associate with the token"),
            ),
        )
        .get_matches();

    let (command, matches) = app_matches.subcommand().unwrap();
    let mut wallet_manager: Option<Rc<RemoteWalletManager>> = None;

    let config = {
        let cli_config = if let Some(config_file) = matches.value_of("config_file") {
            solana_cli_config::Config::load(config_file).unwrap_or_default()
        } else {
            solana_cli_config::Config::default()
        };

        let default_signer = DefaultSigner::new(
            "keypair",
            matches
                .value_of("keypair")
                .map(|s| s.to_string())
                .unwrap_or_else(|| cli_config.keypair_path.clone()),
        );

        let json_rpc_url = normalize_to_url_if_moniker(
            matches
                .value_of("json_rpc_url")
                .unwrap_or(&cli_config.json_rpc_url),
        );

        let websocket_url = solana_cli_config::Config::compute_websocket_url(&json_rpc_url);
        Config {
            commitment_config: CommitmentConfig::confirmed(),
            default_signer: default_signer
                .signer_from_path(matches, &mut wallet_manager)
                .unwrap_or_else(|err| {
                    eprintln!("error: {err}");
                    exit(1);
                }),
            json_rpc_url,
            verbose: matches.is_present("verbose"),
            websocket_url,
        }
    };
    solana_logger::setup_with_default("solana=info");

    if config.verbose {
        println!("JSON RPC URL: {}", config.json_rpc_url);
        println!("Websocket URL: {}", config.websocket_url);
    }
    let rpc_client =
        RpcClient::new_with_commitment(config.json_rpc_url.clone(), config.commitment_config);

    match (command, matches) {
        ("set", arg_matches) => {
            let mint =
                pubkey_of(arg_matches, "mint").unwrap_or_else(|| config.default_signer.pubkey());
            let gatekeeper_network =
                pubkey_of(arg_matches, "gatekeeper network").unwrap();
            println!("Setting the gatekeeper network of {} to {}", mint, gatekeeper_network);
            let signature = process_initialize_extra_account_metas(&rpc_client, config.default_signer.as_ref(), &mint, &gatekeeper_network)
                .await
                .unwrap_or_else(|err| {
                    eprintln!("error: send transaction: {err}");
                    exit(1);
                });
            println!("Signature: {signature}");
        }
        _ => unreachable!(),
    };

    Ok(())
}