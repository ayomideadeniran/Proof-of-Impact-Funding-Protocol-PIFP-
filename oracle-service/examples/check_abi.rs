use starknet::{
    providers::{jsonrpc::{HttpTransport, JsonRpcClient}, Provider},
    core::types::{BlockId, BlockTag, FieldElement},
};
use url::Url;

#[tokio::main]
async fn main() {
    let rpc_url = Url::parse("https://free-rpc.nethermind.io/sepolia-juno").unwrap();
    let provider = JsonRpcClient::new(HttpTransport::new(rpc_url));
    let contract_address = FieldElement::from_hex_be("0x07a0ac05b1e0472a78e40f6c19942484bdd2440a9568382fee997f36edb937fa").unwrap();

    let class_hash = provider.get_class_hash_at(BlockId::Tag(BlockTag::Latest), contract_address).await;
    match class_hash {
        Ok(hash) => println!("Class Hash: {:#x}", hash),
        Err(e) => println!("Error getting class hash: {:?}", e),
    }

    let class = provider.get_class_at(BlockId::Tag(BlockTag::Latest), contract_address).await;
    match class {
        Ok(c) => {
            // We can't easily parse the whole JSON here without more dependencies,
            // but we can look for strings in the output.
            println!("Class retrieved successfully");
        }
        Err(e) => println!("Error getting class: {:?}", e),
    }
}
