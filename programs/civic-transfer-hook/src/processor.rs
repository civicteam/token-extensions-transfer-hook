//! Program state processor
use solana_gateway::Gateway;
use spl_tlv_account_resolution::account::ExtraAccountMeta;
use spl_tlv_account_resolution::seeds::Seed;
use spl_tlv_account_resolution::state::ExtraAccountMetaList;
use {
    solana_program::{
        account_info::{next_account_info, AccountInfo},
        entrypoint::ProgramResult,
        msg,
        program::invoke_signed,
        program_error::ProgramError,
        pubkey::Pubkey,
        system_instruction,
    },
    spl_token_2022::{
        extension::{
            transfer_hook::TransferHookAccount, BaseStateWithExtensions, StateWithExtensions,
        },
        state::{Account, Mint},
    },
    spl_transfer_hook_interface::{
        collect_extra_account_metas_signer_seeds,
        error::TransferHookError,
        get_extra_account_metas_address, get_extra_account_metas_address_and_bump_seed,
        instruction::{ExecuteInstruction, TransferHookInstruction},
    },
};
use crate::instruction::CivicTransferHookInstruction;

/// The seed literal for deriving the gateway token account address.
/// Defined here: https://github.com/identity-com/on-chain-identity-gateway/blob/develop/solana/program/src/state.rs#L20
pub const GATEWAY_TOKEN_ADDRESS_SEED: &[u8] = br"gateway";

/// The program owner of gateway tokens.
/// Defined here: https://github.com/identity-com/on-chain-identity-gateway/blob/develop/solana/program/program-id.md
/// gatem74V238djXdzWnJf94Wo1DcnuGkfijbf3AuBhfs
pub const GATEWAY_PROGRAM_ID: Pubkey = Pubkey::new_from_array([
    10,  35, 248, 193, 156,  10,  77, 255,
    245, 245,  47,  38, 174, 200,  84,  58,
    98,  42,  12, 197, 198,  30,  81,  25,
    62, 157,  73,  19, 220, 196, 171,  94
]);

fn check_token_account_is_transferring(account_info: &AccountInfo) -> Result<(), ProgramError> {
    let account_data = account_info.try_borrow_data()?;
    let token_account = StateWithExtensions::<Account>::unpack(&account_data)?;
    let extension = token_account.get_extension::<TransferHookAccount>()?;
    if bool::from(extension.transferring) {
        Ok(())
    } else {
        Err(TransferHookError::ProgramCalledOutsideOfTransfer.into())
    }
}

/// Processes an [Execute](enum.TransferHookInstruction.html) instruction.
pub fn process_execute(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    amount: u64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let source_account_info = next_account_info(account_info_iter)?;
    let mint_info = next_account_info(account_info_iter)?;
    let destination_account_info = next_account_info(account_info_iter)?;
    let _authority_info = next_account_info(account_info_iter)?;
    let extra_account_metas_info = next_account_info(account_info_iter)?;

    // Check that the accounts are properly in "transferring" mode
    check_token_account_is_transferring(source_account_info)?;
    check_token_account_is_transferring(destination_account_info)?;

    // check that the correct extra account metas pda and validation pubkeys are provided
    let expected_validation_address = get_extra_account_metas_address(mint_info.key, program_id);
    if expected_validation_address != *extra_account_metas_info.key {
        return Err(ProgramError::InvalidSeeds);
    }

    let data = extra_account_metas_info.try_borrow_data()?;

    msg!("Checking each extra account meta");

    ExtraAccountMetaList::check_account_infos::<ExecuteInstruction>(
        accounts,
        &TransferHookInstruction::Execute { amount }.pack(),
        program_id,
        &data,
    )?;

    msg!("Checked extra account metas");

    let extra_account_infos = account_info_iter.as_slice();
    // the gatekeeper network that the gateway token must belong to (specified by the Token2022 token extra account metas)
    let gatekeeper_network = extra_account_infos[0].key;
    // the gateway token account
    let gateway_token = &extra_account_infos[2];
    // the owner of the gateway token account. Usually this would be the recipient owner.
    // But in this case, it is the token account (see more details below)
    let owner = destination_account_info;

    msg!("checking gateway token: {}", gateway_token.key);

    Gateway::verify_gateway_token_account_info(
        gateway_token,
        &owner.key,
        &gatekeeper_network,
        None
    )?;

    msg!("checked gateway token - hook complete");

    Ok(())
}

/// Processes a [InitializeExtraAccountMetas](enum.TransferHookInstruction.html) instruction.
pub fn process_initialize_extra_account_metas(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    gatekeeper_network: &Pubkey
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let extra_account_metas_info = next_account_info(account_info_iter)?;
    let mint_info = next_account_info(account_info_iter)?;
    let authority_info = next_account_info(account_info_iter)?;
    let _system_program_info = next_account_info(account_info_iter)?;

    // check that the mint authority is valid without fully deserializing
    let mint_data = mint_info.try_borrow_data()?;
    let mint = StateWithExtensions::<Mint>::unpack(&mint_data)?;
    let mint_authority = mint
        .base
        .mint_authority
        .ok_or(TransferHookError::MintHasNoMintAuthority)?;

    // Check signers
    if !authority_info.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    if *authority_info.key != mint_authority {
        return Err(TransferHookError::IncorrectMintAuthority.into());
    }

    // Check validation account
    let (expected_validation_address, bump_seed) =
        get_extra_account_metas_address_and_bump_seed(mint_info.key, program_id);
    if expected_validation_address != *extra_account_metas_info.key {
        return Err(ProgramError::InvalidSeeds);
    }

    // The first extra account is the gatekeeper network.
    // This is a fixed key i.e. the execute function requires literally this account for all transactions
    let gkn_pod_account_meta = ExtraAccountMeta::new_with_pubkey(gatekeeper_network, false, false)?;
    let gateway_program_extra_account_meta = ExtraAccountMeta::new_with_pubkey(&GATEWAY_PROGRAM_ID, false, false)?;
    // The second extra account is the token recipient's gateway token. This is a PDA, derived from the recipient address and the gatekeeper network
    let gt_extra_account_meta = ExtraAccountMeta::new_external_pda_with_seeds(6, &[
        // gateway token owner - usually this is the user address, in this case, the recipient.
        // however, since the token owner is not present in the transfer instruction, we will instead use the
        // recipient token account.
        // This means that the gateway token must be associated with the token account, rather than the user.
        // A separate service (can be on- or off-chain) is needed to associate a gateway token with a token account,
        // if the owner has one.
        Seed::AccountKey { index: 2 },
        // literal seed
        Seed::Literal { bytes: GATEWAY_TOKEN_ADDRESS_SEED.into() },
        // configurable seed (we assume 0 here for simplicity)
        Seed::Literal { bytes: [0; 8].into() },
        // gkn
        Seed::AccountKey { index: 5 }
    ], false, false)?;

    let extra_account_metas = &[
        gkn_pod_account_meta,
        gateway_program_extra_account_meta,
        gt_extra_account_meta
    ];

    // Create the account
    let bump_seed = [bump_seed];
    let signer_seeds = collect_extra_account_metas_signer_seeds(mint_info.key, &bump_seed);
    let length = extra_account_metas.len();
    let account_size = ExtraAccountMetaList::size_of(length)?;
    msg!("Allocating {} bytes", account_size);
    invoke_signed(
        &system_instruction::allocate(extra_account_metas_info.key, account_size as u64),
        &[extra_account_metas_info.clone()],
        &[&signer_seeds],
    )?;
    invoke_signed(
        &system_instruction::assign(extra_account_metas_info.key, program_id),
        &[extra_account_metas_info.clone()],
        &[&signer_seeds],
    )?;

    // copy the pod_account_metas into the account
    let mut data = extra_account_metas_info.try_borrow_mut_data()?;
    ExtraAccountMetaList::init::<ExecuteInstruction>(
        &mut data,
        extra_account_metas,
    )?;

    Ok(())
}

/// Processes an [Instruction](enum.Instruction.html).
pub fn process(program_id: &Pubkey, accounts: &[AccountInfo], input: &[u8]) -> ProgramResult {
    let transfer_hook_instruction_result = TransferHookInstruction::unpack(input);

    if let Ok(instruction) = transfer_hook_instruction_result {
        match instruction {
            TransferHookInstruction::Execute { amount } => {
                msg!("Instruction: Execute");
                return process_execute(program_id, accounts, amount);
            }
            _ => {}
        }
    }

    let instruction = CivicTransferHookInstruction::unpack(input)?;

    match instruction {
        CivicTransferHookInstruction::InitializeExtraAccountMetas { gatekeeper_network } => {
            msg!("Instruction: InitializeExtraAccountMetas");
            process_initialize_extra_account_metas(program_id, accounts, &gatekeeper_network)
        }
    }
}