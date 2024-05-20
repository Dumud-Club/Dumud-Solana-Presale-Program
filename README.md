# Presale contract for $DUMUD
1. Controller can deposit the amount of tokens for presale.
2. Users can deposit $SOL which will be limited to 10 $SOL / 250,000 $DUMUD.
3. Extra $SOL past limits will not be accounted for and be affected.
4. Deposited $SOL should be transferred to the specified receiver address automatically.
5. When there isn't enough $DUMUD compared to the amount User wants to purchase, program will only calculate based on the remaining Dumud (if still under purchase limits).
6. Each wallet can buy $DUMUD through multiple transactions, but total $SOL cannot exceed 10 $SOL.

# Workflow & Authority
## Prepare presale by owner
1. Controller creates a new token($DUMUD).
2. Controller initialize presale for specific token.
3. Controller can start or stop presale.
4. Controller cannot withdraw any tokens, only burn remaining presale tokens.
   
## Presale
1. User can buy tokens with SOL limited by purchase cap in a transaction or in multiple transactions.
   
## Authorization
1. Controller can't initialize a presale of which token is not created by the Controller.
2. Users cannot initialize a presale.
3. Users cannot start or stop presale.
4. Presale Token Balance is not withdrawable, only can be burnt which the Controller has Authority.

# Initialize Vault
`anchor run initVault -- --mint <TokenMintAddress> --controller <ControllerPrivateKey>`
# to get controller's privateKey from a JSON
`anchor run privateKey -- --path <controllerKeyPath>`
# buy token
`anchor run buy --user <UserPrivateKey> --amount <AmountInLamports>`
