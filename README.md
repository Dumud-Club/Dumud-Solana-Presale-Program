# Presale contract for $DUMUD
1. Owner can deposit the amount of token for presale from their wallet.
2. Users can deposit $SOL which will be limited to 3 $SOL and receive up to 75,000 $DUMUD.
3. Extra $SOL should be returned to the user.
4. Deposited $SOL should be transferred to the owner automatically.
5. When there isn't enough $DUMUD, send remaining $DUMUD left in the contract and refund extra $SOL to the user.
6. Users can buy $DUMUD through several transactions, but total $SOL can't be exceeded by 3 $SOL.

# Workflow & Authority
## Prepare presale by owner
1. Owner create a new token($DUMUD).
2. Owner initialize presale for a specific token.
3. Owner can start or stop presale.
4. Owner cannot withdraw any tokens, only burn.
## Presale
1. User can buy tokens with some SOL limited by cap in a transaction or a few transactions as they want.
## Authorization
1. User can't initalize presale of which token is not created by him.
2. User can't start or stop presale.
3. User can't withdraw presale balance.

# Initialize Vault
`anchor run initVault -- --mint <mintKey> --controller <controllerPrivateKey>`
# to get controller's privateKey
`anchor run privateKey -- --path <controllerKeyPath>`
# buy token
`anchor run buy -- --mint <mintKey> --user <userPrivateKey> --controller <controllerPrivateKey> --amount <amountInLamports> --receiver <receiverPublicKey>`
