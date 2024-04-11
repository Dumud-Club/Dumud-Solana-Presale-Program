1) create deployer(=mint authority), controller, user
   solana-keygen, pick privateKey

* `solana-keygen new`
* rename id.json to deployer.json
* `anchor run private-key`
deployer = 
	FHNXB465avBQyqcwDM8zBmM1tkM9DhrcEXgtcehW5Xwm

* `solana-keygen new`
* rename id.json to controller.json
* `anchor run private-key`
controller = 5P4omYXSQYbLVgD3yqmNJXgMPtMuKDoo3ZvSQMmEMMEuYDYyNnqefBP44Q7hKC6KUKtEgb1cbHASYcmqh5GBPivD
	DD8Vj77HKSpfHZ7GizfTx79tjgaZmf2fjADkvxrjnDv9

* `solana-keygen new`
* rename id.json to user.json
* `anchor run private-key`
user = 3B7AmvAAGZ7i3DQCLgTZWzcosPDaSb13ARPnHe3NtZJixxivGWupb5At5aAGthU3j23bfAqE24Z9t3KWRcsgWug8
	813CQtajdTLPLjvqdkipFEMvrm2WrWriaV1xso1ych5e
    	

2) deploy presale contract
* select deployer wallet(rename ~/.config/solana/deployer.json to ~/.config/solana/id.json)
* `solana airdrop 3`
* `anchor deploy`
program Id(pubkey): FrByURbsBpBQRVhZW5FJ1TYnqwbMLNJA7tJzSV4UKhZZ

3) create mint by controller
* select controller wallet(rename ~/.config/solana/controller.json to ~/.config/solana/id.json)
* `solana airdrop 3`
* `spl-token create-token`
    Creating token 9LNwDSqsy26kVewEAQtovqRREyDtkvB4SAjiyLgZEKbT under program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA

    Address:  9LNwDSqsy26kVewEAQtovqRREyDtkvB4SAjiyLgZEKbT
    Decimals:  9

    Signature: 3JZ64vHhvwG56sqrK7Vk8S3X8aKuFXPuSuNPLRpSKwxm5k2To4tYyNwqKnxeJf5pTmKeBW4uaKNsXuTTsvzQGMRd

* `spl-token create-account 9LNwDSqsy26kVewEAQtovqRREyDtkvB4SAjiyLgZEKbT`
    Creating account xQyNv3SYw6JYKMS9N1ibpai28uc2VQW5sjdAHgRPWii

    Signature: 2877LoH6jFwuKXKmPxSCkifLFKf2T2cwFZcKFc919ULgvz3SiwEMfNLtS3CTFVFjZUP5q6z44X3CeSGudgN4jrRP

* `spl-token mint 9LNwDSqsy26kVewEAQtovqRREyDtkvB4SAjiyLgZEKbT 888888888 xQyNv3SYw6JYKMS9N1ibpai28uc2VQW5sjdAHgRPWii`
    Minting 888888888 tokens
    Token: 9LNwDSqsy26kVewEAQtovqRREyDtkvB4SAjiyLgZEKbT
    Recipient: xQyNv3SYw6JYKMS9N1ibpai28uc2VQW5sjdAHgRPWii

    Signature: 54xBJcRD79C4mQX6ukz6K9pnmAudkbBp3UuVjwhHUYAgDg2iY4pp1Zjdj1Mtj7e1Gy2KxKmwTciZCo5myXJ98h8L

5) init vault
`anchor run init-vault`
deployer: FHNXB465avBQyqcwDM8zBmM1tkM9DhrcEXgtcehW5Xwm
controller: DD8Vj77HKSpfHZ7GizfTx79tjgaZmf2fjADkvxrjnDv9
user: 813CQtajdTLPLjvqdkipFEMvrm2WrWriaV1xso1ych5e
receiver: 4FSwJ68KUcUjUSj9xqqXDhZQqidxJQ8R8PrKuQLs5RSp
please transfer presale token to [vaultKey]: CipbcWfx3ZMF1MPS1rj6A49HrhUWbAKEMSSS7wbuxYsY
vaultKey CipbcWfx3ZMF1MPS1rj6A49HrhUWbAKEMSSS7wbuxYsY
poolKey 63P7vTSyaTQQmaM91kSn9quXiRMZk14KoQsNpoDmfYn3

6) disable mint
`spl-token authorize --disable 9LNwDSqsy26kVewEAQtovqRREyDtkvB4SAjiyLgZEKbT  mint`

 mint
Updating 9LNwDSqsy26kVewEAQtovqRREyDtkvB4SAjiyLgZEKbT
  Current mint: DD8Vj77HKSpfHZ7GizfTx79tjgaZmf2fjADkvxrjnDv9
  New mint: disabled

Signature: 5SNGXTMZB7ACsTDQ6s9jcN8iPJVuzYP44efqTVGMjAYSiiNnjcRsZMnGPdDS6macP9MAiciaPwV4ipsqqGp4fKYs

test
`spl-token mint 9LNwDSqsy26kVewEAQtovqRREyDtkvB4SAjiyLgZEKbT 1 xQyNv3SYw6JYKMS9N1ibpai28uc2VQW5sjdAHgRPWii`

Minting 1 tokens
  Token: 9LNwDSqsy26kVewEAQtovqRREyDtkvB4SAjiyLgZEKbT
  Recipient: xQyNv3SYw6JYKMS9N1ibpai28uc2VQW5sjdAHgRPWii
Error: Client(Error { request: Some(SendTransaction), kind: RpcError(RpcResponseError { code: -32002, message: "Transaction simulation failed: Error processing Instruction 0: custom program error: 0x5", data: SendTransactionPreflightFailure(RpcSimulateTransactionResult { err: Some(InstructionError(0, Custom(5))), logs: Some(["Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [1]", "Program log: Instruction: MintToChecked", "Program log: Error: the total supply of this token is fixed", "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 4147 of 200000 compute units", "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA failed: custom program error: 0x5"]), accounts: None, units_consumed: Some(4147), return_data: None }) }) })

7) transfer token to vault
`spl-token transfer 9LNwDSqsy26kVewEAQtovqRREyDtkvB4SAjiyLgZEKbT 400000000 CipbcWfx3ZMF1MPS1rj6A49HrhUWbAKEMSSS7wbuxYsY`

Transfer 400000000 tokens
  Sender: xQyNv3SYw6JYKMS9N1ibpai28uc2VQW5sjdAHgRPWii
  Recipient: CipbcWfx3ZMF1MPS1rj6A49HrhUWbAKEMSSS7wbuxYsY

Signature: 3sfNxiaXYU4KRGb6t8hLroxQjWqwdM8ns6FSkMN8532DPWZEyRD2444deescxbTj9cuyo27JoQdUN6VkaTEN5oxF

8) buy token by user
* select user account(rename ~/.config/solana/user.json to ~/.config/solana/id.json)
* `anchor run buy`