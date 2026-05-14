import Web3 from 'web3';

const MASTER_CONTRACT_ABI = [
  {
    "inputs": [],
    "name": "getAssetCount",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "string", "name": "_assetType", "type": "string"}],
    "name": "createAsset",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// XMRT Token Contract ABI
const XMRT_TOKEN_ABI = [
  // ERC20 Standard Functions
  {
    "constant": true,
    "inputs": [{"name": "_owner", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "balance", "type": "uint256"}],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [{"name": "_to", "type": "address"}, {"name": "_value", "type": "uint256"}],
    "name": "transfer",
    "outputs": [{"name": "", "type": "bool"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{"name": "", "type": "uint8"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "symbol",
    "outputs": [{"name": "", "type": "string"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "name",
    "outputs": [{"name": "", "type": "string"}],
    "type": "function"
  },
  // Staking Functions
  {
    "inputs": [{"internalType": "uint256", "name": "amount", "type": "uint256"}],
    "name": "stake",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "amount", "type": "uint256"}],
    "name": "unstake", 
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "", "type": "address"}],
    "name": "userStakes",
    "outputs": [
      {"internalType": "uint128", "name": "amount", "type": "uint128"},
      {"internalType": "uint64", "name": "timestamp", "type": "uint64"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalStaked",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  // Events
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "user", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "Staked",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "user", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "Unstaked",
    "type": "event"
  }
];

const MASTER_CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000'; // Replace with actual contract address

// XMRT Token Contract Addresses
const XMRT_CONTRACT_ADDRESSES = {
  1: '0x0000000000000000000000000000000000000000', // Mainnet (replace with actual)
  11155111: '0x0000000000000000000000000000000000000000' // Sepolia (replace with actual)
};

// Faucet wallet address (should be funded with XMRT tokens)
const FAUCET_WALLET_ADDRESS = '0xaE2402dFdD313B8c40AF06d3292B50dE1eD75F68'; // Admin address from contract

export const initializeMasterContract = async (web3: Web3) => {
  try {
    const contract = new web3.eth.Contract(MASTER_CONTRACT_ABI as any, MASTER_CONTRACT_ADDRESS);
    const assetCount = await contract.methods.getAssetCount().call();
    console.log('Current asset count:', assetCount);
    return contract;
  } catch (error) {
    console.error('Error initializing master contract:', error);
    return null;
  }
};

export const createNewAsset = async (contract: any, assetType: string, account: string) => {
  try {
    const result = await contract.methods.createAsset(assetType).send({ from: account });
    console.log('Asset created:', result);
    return result;
  } catch (error) {
    console.error('Error creating asset:', error);
    return null;
  }
};

// XMRT Token Functions
export const getXMRTContract = (web3: Web3, chainId: number) => {
  const contractAddress = XMRT_CONTRACT_ADDRESSES[chainId as keyof typeof XMRT_CONTRACT_ADDRESSES];
  if (!contractAddress) {
    throw new Error(`XMRT contract not deployed on chain ${chainId}`);
  }
  return new web3.eth.Contract(XMRT_TOKEN_ABI as any, contractAddress);
};

export const getXMRTBalance = async (web3: Web3, address: string, chainId: number) => {
  try {
    const contract = getXMRTContract(web3, chainId);
    const balance = await contract.methods.balanceOf(address).call();
    return web3.utils.fromWei(String(balance), 'ether');
  } catch (error) {
    console.error('Error getting XMRT balance:', error);
    return '0';
  }
};

export const getXMRTStakeInfo = async (web3: Web3, address: string, chainId: number) => {
  try {
    const contract = getXMRTContract(web3, chainId);
    const stakeInfo = await contract.methods.userStakes(address).call() as any;
    return {
      amount: web3.utils.fromWei(stakeInfo.amount || '0', 'ether'),
      timestamp: Number(stakeInfo.timestamp || 0),
      canUnstakeWithoutPenalty: Date.now() / 1000 > Number(stakeInfo.timestamp || 0) + (7 * 24 * 60 * 60) // 7 days
    };
  } catch (error) {
    console.error('Error getting XMRT stake info:', error);
    return { amount: '0', timestamp: 0, canUnstakeWithoutPenalty: true };
  }
};

// Faucet Functions
export const claimXMRTFaucet = async (web3: Web3, recipientAddress: string, chainId: number) => {
  try {
    if (chainId !== 11155111) {
      throw new Error('Faucet only available on Sepolia testnet');
    }

    // Check rate limiting
    const lastClaim = localStorage.getItem(`xmrt_faucet_${recipientAddress}`);
    if (lastClaim) {
      const timeSinceLastClaim = Date.now() - parseInt(lastClaim);
      const cooldownPeriod = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      if (timeSinceLastClaim < cooldownPeriod) {
        const remainingTime = cooldownPeriod - timeSinceLastClaim;
        throw new Error(`Cooldown active. Try again in ${Math.ceil(remainingTime / (60 * 60 * 1000))} hours`);
      }
    }

    const contract = getXMRTContract(web3, chainId);
    const faucetAmount = web3.utils.toWei('100', 'ether'); // 100 XMRT

    // This would typically be a backend call to a faucet service
    // For now, we'll simulate the transaction from the faucet wallet
    const accounts = await web3.eth.getAccounts();
    const result = await contract.methods.transfer(recipientAddress, faucetAmount).send({
      from: accounts[0] // In production, this would be the funded faucet wallet
    });

    // Store claim timestamp
    localStorage.setItem(`xmrt_faucet_${recipientAddress}`, Date.now().toString());

    return result;
  } catch (error) {
    console.error('Error claiming XMRT faucet:', error);
    throw error;
  }
};

// Staking Functions
export const stakeXMRT = async (web3: Web3, amount: string, account: string, chainId: number) => {
  try {
    const contract = getXMRTContract(web3, chainId);
    const stakeAmount = web3.utils.toWei(amount, 'ether');
    
    const result = await contract.methods.stake(stakeAmount).send({ from: account });
    return result;
  } catch (error) {
    console.error('Error staking XMRT:', error);
    throw error;
  }
};

export const unstakeXMRT = async (web3: Web3, amount: string, account: string, chainId: number) => {
  try {
    const contract = getXMRTContract(web3, chainId);
    const unstakeAmount = web3.utils.toWei(amount, 'ether');
    
    const result = await contract.methods.unstake(unstakeAmount).send({ from: account });
    return result;
  } catch (error) {
    console.error('Error unstaking XMRT:', error);
    throw error;
  }
};

// Utility function to check if user can claim faucet
export const canClaimFaucet = (address: string): { canClaim: boolean; remainingTime?: number } => {
  const lastClaim = localStorage.getItem(`xmrt_faucet_${address}`);
  if (!lastClaim) {
    return { canClaim: true };
  }

  const timeSinceLastClaim = Date.now() - parseInt(lastClaim);
  const cooldownPeriod = 24 * 60 * 60 * 1000; // 24 hours

  if (timeSinceLastClaim >= cooldownPeriod) {
    return { canClaim: true };
  }

  return {
    canClaim: false,
    remainingTime: cooldownPeriod - timeSinceLastClaim
  };
};