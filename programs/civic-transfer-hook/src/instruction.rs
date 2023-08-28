//! Instruction types

use {
    solana_program::{
        instruction::{AccountMeta, Instruction},
        program_error::ProgramError,
        pubkey::Pubkey,
        system_program,
    },
    spl_discriminator::{ArrayDiscriminator, SplDiscriminate},
};

/// Instructions supported by the transfer hook interface.
#[repr(C)]
#[derive(Clone, Debug, PartialEq)]
pub enum CivicTransferHookInstruction {
    /// Initializes the extra account metas on an account, writing into
    /// the first open TLV space.
    ///
    /// Accounts expected by this instruction:
    ///
    ///   0. `[w]` Account with extra account metas
    ///   1. `[]` Mint
    ///   2. `[s]` Mint authority
    ///   3. `[]` System program
    ///   4..4+M `[]` `M` additional accounts, to be written to validation data
    ///
    InitializeExtraAccountMetas {
        /// The Gatekeeper Network that this token uses.
        /// Recipients of this token are required to have a gateway token from this network.
        gatekeeper_network: Pubkey
    },
}
/// TLV instruction type used to initialize extra account metas
/// for the transfer hook
#[derive(SplDiscriminate)]
#[discriminator_hash_input("spl-transfer-hook-interface:initialize-extra-account-metas")]
pub struct InitializeExtraAccountMetasInstruction;

impl CivicTransferHookInstruction {
    /// Unpacks a byte buffer into a [TransferHookInstruction](enum.TransferHookInstruction.html).
    pub fn unpack(input: &[u8]) -> Result<Self, ProgramError> {
        if input.len() < ArrayDiscriminator::LENGTH {
            return Err(ProgramError::InvalidInstructionData);
        }
        let (discriminator, rest) = input.split_at(ArrayDiscriminator::LENGTH);
        Ok(match discriminator {
            InitializeExtraAccountMetasInstruction::SPL_DISCRIMINATOR_SLICE => {
                let gatekeeper_network = rest
                    .get(..32)
                    .map(Pubkey::try_from)
                    .ok_or(ProgramError::InvalidInstructionData)?
                    .map_err(|_| ProgramError::InvalidInstructionData)?;
                Self::InitializeExtraAccountMetas {
                    gatekeeper_network
                }
            }
            _ => return Err(ProgramError::InvalidInstructionData),
        })
    }

    /// Packs a [TokenInstruction](enum.TokenInstruction.html) into a byte buffer.
    pub fn pack(&self) -> Vec<u8> {
        let mut buf = vec![];
        match self {
            Self::InitializeExtraAccountMetas { gatekeeper_network } => {
                buf.extend_from_slice(
                    InitializeExtraAccountMetasInstruction::SPL_DISCRIMINATOR_SLICE,
                );
                buf.extend_from_slice(&gatekeeper_network.to_bytes())
            }
        };
        buf
    }
}

/// Creates a `InitializeExtraAccountMetas` instruction.
pub fn initialize_extra_account_metas(
    program_id: &Pubkey,
    extra_account_metas_pubkey: &Pubkey,
    mint_pubkey: &Pubkey,
    authority_pubkey: &Pubkey,
    gatekeeper_network: &Pubkey,
) -> Instruction {
    let data = CivicTransferHookInstruction::InitializeExtraAccountMetas { gatekeeper_network: *gatekeeper_network }.pack();

    let accounts = vec![
        AccountMeta::new(*extra_account_metas_pubkey, false),
        AccountMeta::new_readonly(*mint_pubkey, false),
        AccountMeta::new_readonly(*authority_pubkey, true),
        AccountMeta::new_readonly(system_program::id(), false),
    ];

    Instruction {
        program_id: *program_id,
        accounts,
        data,
    }
}

#[cfg(test)]
mod test {
    use {super::*, spl_transfer_hook_interface::NAMESPACE, solana_program::hash};

    #[test]
    fn initialize_validation_pubkeys_packing() {
        let check = CivicTransferHookInstruction::InitializeExtraAccountMetas;
        let packed = check.pack();
        // Please use INITIALIZE_EXTRA_ACCOUNT_METAS_DISCRIMINATOR in your program,
        // the following is just for test purposes
        let preimage =
            hash::hashv(&[format!("{NAMESPACE}:initialize-extra-account-metas").as_bytes()]);
        let discriminator = &preimage.as_ref()[..ArrayDiscriminator::LENGTH];
        let mut expect = vec![];
        expect.extend_from_slice(discriminator.as_ref());
        assert_eq!(packed, expect);
        let unpacked = CivicTransferHookInstruction::unpack(&expect).unwrap();
        assert_eq!(unpacked, check);
    }
}
