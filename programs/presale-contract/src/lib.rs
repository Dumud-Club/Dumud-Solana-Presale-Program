use std::str::FromStr;
use anchor_lang::{prelude::*, solana_program::{self, native_token::LAMPORTS_PER_SOL}};
use anchor_spl::token::{self, Transfer, TokenAccount, Token, Mint, Burn};

declare_id!("FrByURbsBpBQRVhZW5FJ1TYnqwbMLNJA7tJzSV4UKhZZ");

const TOKENS_PER_USER: u64 = 75_000 * LAMPORTS_PER_SOL; // for 3 SOL
const TOKENS_PER_SOL: u64 = 25_000 * LAMPORTS_PER_SOL;
const RECEIVER_ADDRESS: &str = "4FSwJ68KUcUjUSj9xqqXDhZQqidxJQ8R8PrKuQLs5RSp";

#[program]
pub mod presale_contract {
    use anchor_lang::solana_program::{native_token::LAMPORTS_PER_SOL, system_instruction};

    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        require!(ctx.accounts.mint.mint_authority.is_some(), ErrorCode::Unauthorized);
        require_keys_eq!(ctx.accounts.mint.mint_authority.unwrap(), *ctx.accounts.payer.key, ErrorCode::Unauthorized);
        let pool = &mut ctx.accounts.pool;
        pool.owner = *ctx.accounts.payer.key;
        pool.mint = ctx.accounts.mint.key();
        pool.bump_seed = ctx.bumps.pool;
        pool.sale_enabled = true;
        Ok(())
    }

    pub fn set_sale(ctx: Context<SetSale>, new_value: bool) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        pool.sale_enabled = new_value;
        Ok(())
    }

    pub fn burn(ctx: Context<BurnPresale>) -> Result<()> {

        require!(!ctx.accounts.pool.sale_enabled, ErrorCode::SaleAvailable);

        require!(ctx.accounts.vault.amount > 0, ErrorCode::VaultIsEmpty);        

        let cpi_accounts = Burn {
            mint: ctx.accounts.mint.to_account_info(),
            from: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.pool.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
    
        token::burn(
            CpiContext::new_with_signer(
                cpi_program, 
                cpi_accounts,
                &[&[b"pool".as_ref(), ctx.accounts.pool.owner.as_ref(), ctx.accounts.mint.key().as_ref(), &[ctx.accounts.pool.bump_seed]]]
            ),
            ctx.accounts.vault.amount)?;

        Ok(())
    }

    // pub fn init_user(ctx: Context<Create>) -> Result<()> {
    //     let saled_amount = &mut ctx.accounts.saled_account;
    //     saled_amount.user = *ctx.accounts.user.key;
    //     saled_amount.amount = 0;        

    //     Ok(())
    // }

    pub fn buy(ctx: Context<Buy>, amount: u64) -> Result<()> {

        // if saled_amount isn't initialized, initialize it.
        let saled_amount = &mut ctx.accounts.saled_amount;
        if saled_amount.user == Pubkey::from_str("11111111111111111111111111111111").unwrap() {
            saled_amount.user = *ctx.accounts.user.key;
            saled_amount.amount = 0;    
        }

        // check authority
        require_keys_eq!(
            ctx.accounts.user.key(),
            ctx.accounts.saled_amount.user,
            ErrorCode::Unauthorized
        );

        require_keys_eq!(
            ctx.accounts.recipent.key(), 
            Pubkey::from_str(RECEIVER_ADDRESS).unwrap(), 
            ErrorCode::UnmatchedRecipent
        );

        require_keys_eq!(
            ctx.accounts.pool.mint.key(),
            ctx.accounts.mint.key(),
            ErrorCode::UnmatchedToken,
        );

        require!(ctx.accounts.pool.sale_enabled, ErrorCode::SaleNotAvailable);

        let saled_amount = &mut ctx.accounts.saled_amount;

        // 1. check if it's availalbe to sell(sol balance and remained amount are valid)        
        if saled_amount.amount >= TOKENS_PER_USER {
            return Err(ErrorCode::SaleFull.into());
        }

        let remained_amount: u64 = TOKENS_PER_USER - saled_amount.amount;
        let requested_amount: u64 = TOKENS_PER_SOL / LAMPORTS_PER_SOL * amount;
        let mut real_amount = if remained_amount >= requested_amount {requested_amount} else {remained_amount};
        real_amount = if ctx.accounts.vault.amount >= real_amount { real_amount } else {ctx.accounts.vault.amount};
        let extra_amount: u64 = (requested_amount - real_amount) / (TOKENS_PER_SOL / LAMPORTS_PER_SOL);

        // 2. update status(saled.amount)
        {
            saled_amount.amount += real_amount;    
        }
        
        // 3. receive native token from user as needed
        {        
            let transfer_instruction = system_instruction::transfer(
                &ctx.accounts.saled_amount.user,
                &ctx.accounts.recipent.key(),
                if extra_amount > 0 { amount - extra_amount } else { amount },
            );
            solana_program::program::invoke_signed(
                &transfer_instruction,
                &[
                    ctx.accounts.user.to_account_info(),
                    ctx.accounts.recipent.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                ],
                &[],
            )?;
        }

        // 4. send spl token(real_amount) to user
        {
            let cpi_accounts = Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.pool.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
        
            token::transfer(
                CpiContext::new_with_signer(
                    cpi_program, 
                    cpi_accounts,
                    &[&[b"pool".as_ref(), ctx.accounts.pool.owner.as_ref(), ctx.accounts.mint.key().as_ref(), &[ctx.accounts.pool.bump_seed]]]
                ),
                real_amount)?;
        }

        Ok(())
    }
}

#[account]
#[derive(InitSpace)]
pub struct SaledAmount {
    pub user: Pubkey,
    pub amount: u64,
}

#[account]
#[derive(InitSpace)]
pub struct Pool {
    pub owner: Pubkey,
    pub mint: Pubkey,
    pub bump_seed: u8,
    pub sale_enabled: bool,
}

#[derive(Accounts)]
pub struct Initialize<'info>{
    /// Payer of rent
    #[account(mut)]
    pub payer: Signer<'info>,
    /// SPL Token Mint of the underlying token to be deposited for presale
    pub mint: Account<'info, Mint>,
    #[account(
        init,
        payer = payer,
        space = 8 + Pool::INIT_SPACE,
        seeds = [b"pool".as_ref(), &payer.key().as_ref(), &mint.key().as_ref()],
        bump,
      )]
    pub pool: Account<'info, Pool>,
    #[account(
        init,
        payer = payer,
        seeds = [b"vault", &pool.key().to_bytes()[..]],
        bump,
        token::mint = mint,
        token::authority = pool,
      )]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetSale<'info>{
    /// Payer of rent
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub pool: Account<'info, Pool>,
    pub system_program: Program<'info, System>,
}

// #[derive(Accounts)]
// pub struct Create<'info> {
//     #[account(
//         init_if_needed, 
//         payer = user, 
//         space = 8 + SaledAmount::INIT_SPACE,
//         seeds = [b"sale", user.key().as_ref()],
//         bump
//     )]
//     pub saled_account: Account<'info, SaledAmount>,
//     #[account(mut)]
//     pub mint_token: Account<'info, token::Mint>,
//     #[account(mut)]
//     pub user: Signer<'info>,
//     pub system_program: Program<'info, System>,
// }

#[derive(Accounts)]
pub struct Buy<'info> {
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(
        init_if_needed, 
        payer = user, 
        space = 8 + SaledAmount::INIT_SPACE,
        seeds = [b"sale", user.key().as_ref()],
        bump
    )]
    pub saled_amount: Account<'info, SaledAmount>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub user_token_account: Box<Account<'info, TokenAccount>>,
    /// CHECK: This is not dangerous because this account is only recipent of SOL
    #[account(mut)]
    pub recipent: AccountInfo<'info>,
    #[account(mut)]
    pub pool: Account<'info, Pool>,
    #[account(mut)]
    pub vault: Box<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BurnPresale<'info> {
    /// Payer of rent
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub pool: Account<'info, Pool>,
    #[account(mut)]
    pub vault: Box<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("You are not authorized to perform this action.")]
    Unauthorized,
    #[msg("Your sale is full")]
    SaleFull,
    #[msg("Not enough native token")]
    NotEnoughSol,
    #[msg("Recipent doesn't match")]
    UnmatchedRecipent,
    #[msg("Token doesn't match")]
    UnmatchedToken,
    #[msg("Sale is not available")]
    SaleNotAvailable,
    #[msg("Sale is available")]
    SaleAvailable,
    #[msg("Vault is empty")]
    VaultIsEmpty,
}

#[derive(Clone)]
pub struct Presale;

impl anchor_lang::Id for Presale {
    fn id() -> Pubkey {
        ID
    }
}