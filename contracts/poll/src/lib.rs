#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, String, Symbol, Vec,
};

const POLL_KEY: Symbol = symbol_short!("POLL");
const TALLIES_KEY: Symbol = symbol_short!("TALLIES");

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PollView {
    pub question: String,
    pub options: Vec<String>,
    pub tallies: Vec<u32>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PollConfig {
    pub admin: Address,
    pub question: String,
    pub options: Vec<String>,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Voted(Address),
}

#[contract]
pub struct PollContract;

#[contractimpl]
impl PollContract {
    pub fn init(env: Env, admin: Address, question: String, options: Vec<String>) {
        if env.storage().instance().has(&POLL_KEY) {
            panic!("AlreadyInitialized");
        }

        admin.require_auth();

        let option_count = options.len();
        assert!(option_count > 0, "NotInitialized: options must not be empty");

        let config = PollConfig {
            admin: admin.clone(),
            question: question.clone(),
            options: options.clone(),
        };

        let tallies: Vec<u32> = Vec::from_array(&env, [0; 10]).slice(0..option_count);

        env.storage().instance().set(&POLL_KEY, &config);
        env.storage().instance().set(&TALLIES_KEY, &tallies);

        env.events()
            .publish((symbol_short!("poll"), symbol_short!("init")), (question, options));
    }

    pub fn vote(env: Env, voter: Address, option: u32) {
        voter.require_auth();

        if !env.storage().instance().has(&POLL_KEY) {
            panic!("NotInitialized");
        }

        let config: PollConfig = env.storage().instance().get(&POLL_KEY).unwrap();
        let option_index = option as u32;

        if option_index >= config.options.len() {
            panic!("InvalidOption");
        }

        let voter_key = DataKey::Voted(voter.clone());
        if env.storage().persistent().has(&voter_key) {
            panic!("AlreadyVoted");
        }

        let mut tallies: Vec<u32> = env.storage().instance().get(&TALLIES_KEY).unwrap();
        let current = tallies.get(option_index).unwrap_or(0);
        tallies.set(option_index, current + 1);

        env.storage().instance().set(&TALLIES_KEY, &tallies);
        env.storage().persistent().set(&voter_key, &true);

        env.storage()
            .persistent()
            .extend_ttl(&voter_key, 100_000, 100_000);
        env.storage().instance().extend_ttl(100_000, 100_000);

        env.events()
            .publish((symbol_short!("vote"), voter.clone()), option);
    }

    pub fn get_poll(env: Env) -> PollView {
        if !env.storage().instance().has(&POLL_KEY) {
            panic!("NotInitialized");
        }

        let config: PollConfig = env.storage().instance().get(&POLL_KEY).unwrap();
        let tallies: Vec<u32> = env.storage().instance().get(&TALLIES_KEY).unwrap();

        PollView {
            question: config.question,
            options: config.options,
            tallies,
        }
    }

    pub fn has_voted(env: Env, voter: Address) -> bool {
        let voter_key = DataKey::Voted(voter);
        env.storage().persistent().has(&voter_key)
    }

    pub fn get_tally(env: Env) -> Vec<u32> {
        if !env.storage().instance().has(&TALLIES_KEY) {
            panic!("NotInitialized");
        }
        env.storage().instance().get(&TALLIES_KEY).unwrap()
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, vec, Env, String};

    #[test]
    fn test_init_and_vote() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, PollContract);
        let client = PollContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let question = String::from_str(&env, "Best blockchain?");
        let options = vec![
            &env,
            String::from_str(&env, "Stellar"),
            String::from_str(&env, "Ethereum"),
            String::from_str(&env, "Solana"),
        ];

        client.init(&admin, &question, &options);

        let poll = client.get_poll();
        assert_eq!(poll.question, question);
        assert_eq!(poll.options.len(), 3);
        assert_eq!(poll.tallies.get(0).unwrap(), 0);

        let voter = Address::generate(&env);
        client.vote(&voter, &0);

        let poll_after = client.get_poll();
        assert_eq!(poll_after.tallies.get(0).unwrap(), 1);
        assert_eq!(poll_after.tallies.get(1).unwrap(), 0);
        assert!(client.has_voted(&voter));
    }

    #[test]
    #[should_panic(expected = "AlreadyVoted")]
    fn test_double_vote() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, PollContract);
        let client = PollContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let question = String::from_str(&env, "Test?");
        let options = vec![
            &env,
            String::from_str(&env, "A"),
            String::from_str(&env, "B"),
        ];

        client.init(&admin, &question, &options);

        let voter = Address::generate(&env);
        client.vote(&voter, &0);
        client.vote(&voter, &1);
    }

    #[test]
    #[should_panic(expected = "InvalidOption")]
    fn test_invalid_option() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, PollContract);
        let client = PollContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let question = String::from_str(&env, "Test?");
        let options = vec![
            &env,
            String::from_str(&env, "A"),
            String::from_str(&env, "B"),
        ];

        client.init(&admin, &question, &options);

        let voter = Address::generate(&env);
        client.vote(&voter, &5);
    }

    #[test]
    #[should_panic(expected = "AlreadyInitialized")]
    fn test_double_init() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, PollContract);
        let client = PollContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let question = String::from_str(&env, "Test?");
        let options = vec![
            &env,
            String::from_str(&env, "A"),
            String::from_str(&env, "B"),
        ];

        client.init(&admin, &question, &options);
        client.init(&admin, &question, &options);
    }
}
