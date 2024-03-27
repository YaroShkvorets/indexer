import {
  defineIndexerManagementModels,
  defineQueryFeeModels,
  GraphNode,
  IndexerManagementDefaults,
  MultiNetworks,
  Network,
  specification,
} from '@graphprotocol/indexer-common'
import { connectDatabase, Metrics, Logger, parseGRT } from '@graphprotocol/common-ts'
import { createIndexerManagementYogaClient } from '../../indexer-management/yoga'
import { ActionInput, ActionStatus, ActionType } from '../../schema/types.generated'

const PUBLIC_JSON_RPC_ENDPOINT = 'https://ethereum-sepolia.publicnode.com'

const testProviderUrl =
  process.env.INDEXER_TEST_JRPC_PROVIDER_URL ?? PUBLIC_JSON_RPC_ENDPOINT

export const testNetworkSpecification: specification.NetworkSpecification =
  specification.NetworkSpecification.parse({
    networkIdentifier: 'sepolia',
    gateway: {
      url: 'http://127.0.0.1:8030/',
    },
    networkProvider: {
      url: testProviderUrl,
    },
    indexerOptions: {
      address: '0xf56b5d582920E4527A818FBDd801C0D80A394CB8',
      mnemonic:
        'famous aspect index polar tornado zero wedding electric floor chalk tenant junk',
      url: 'http://test-indexer.xyz',
    },
    subgraphs: {
      maxBlockDistance: 10000,
      networkSubgraph: {
        url: 'https://api.thegraph.com/subgraphs/name/graphprotocol/graph-network-sepolia',
      },
      epochSubgraph: {
        url: 'http://test-url.xyz',
      },
    },
    transactionMonitoring: {
      gasIncreaseTimeout: 240000,
      gasIncreaseFactor: 1.2,
      baseFeePerGasMax: 100 * 10 ** 9,
      maxTransactionAttempts: 0,
    },
    dai: {
      contractAddress: '0x4e8a4C63Df58bf59Fef513aB67a76319a9faf448',
      inject: false,
    },
  })

export async function createTestManagementClient(
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  databaseOptions: any,
  logger: Logger,
  injectDai: boolean,
  metrics: Metrics,
  networkIdentifierOverride?: string,
) {
  // Clearing the registry prevents duplicate metric registration in the default registry.
  metrics.registry.clear()

  // Spin up db
  let sequelize = await connectDatabase(databaseOptions)
  const queryFeeModels = defineQueryFeeModels(sequelize)
  const managementModels = defineIndexerManagementModels(sequelize)
  sequelize = await sequelize.sync({ force: true })
  const statusEndpoint = 'http://127.0.0.1:8030/graphql'
  const graphNode = new GraphNode(
    logger,
    'http://test-admin-endpoint.xyz',
    'https://test-query-endpoint.xyz',
    statusEndpoint,
    [],
  )
  const indexNodeIDs = ['node_1']

  const networkSpecification = { ...testNetworkSpecification }
  networkSpecification.dai.inject = injectDai

  const defaults: IndexerManagementDefaults = {
    globalIndexingRule: {
      allocationAmount: parseGRT('100'),
      parallelAllocations: 1,
      requireSupported: true,
      safety: true,
      protocolNetwork: 'sepolia',
    },
  }

  const network = await Network.create(
    logger,
    networkSpecification,
    queryFeeModels,
    graphNode,
    metrics,
  )

  if (networkIdentifierOverride) {
    network.specification.networkIdentifier = networkIdentifierOverride
  }

  const multiNetworks = new MultiNetworks(
    [network],
    (n: Network) => n.specification.networkIdentifier,
  )

  return await createIndexerManagementYogaClient({
    models: managementModels,
    graphNode,
    indexNodeIDs,
    logger,
    defaults,
    multiNetworks,
  })
}

export const defaults: IndexerManagementDefaults = {
  globalIndexingRule: {
    allocationAmount: parseGRT('100'),
    parallelAllocations: 1,
    requireSupported: true,
    safety: true,
  },
}

export const subgraphDeployment1 = 'Qmew9PZUJCoDzXqqU6vGyTENTKHrrN4dy5h94kertfudqy'
export const subgraphDeployment2 = 'QmWq1pmnhEvx25qxpYYj9Yp6E1xMKMVoUjXVQBxUJmreSe'
export const subgraphDeployment3 = 'QmRhH2nhNibDVPZmYqq3TUZZARZ77vgjYCvPNiGBCogtgM'

export const queuedAllocateAction = {
  status: ActionStatus.queued,
  type: ActionType.allocate,
  deploymentID: subgraphDeployment1,
  amount: '10000',
  force: false,
  source: 'indexerAgent',
  reason: 'indexingRule',
  priority: 0,
  protocolNetwork: 'sepolia',
} as ActionInput

export const invalidUnallocateAction = {
  status: ActionStatus.queued,
  type: ActionType.unallocate,
  allocationID: '0x8f63930129e585c69482b56390a09b6b176f4a4c',
  deploymentID: subgraphDeployment1,
  amount: undefined,
  poi: '0x0000000000000000000000000000000000000000000000000000000000000000',
  force: false,
  source: 'indexerAgent',
  reason: 'indexingRule',
  priority: 0,
  protocolNetwork: 'sepolia',
} as ActionInput

export const invalidReallocateAction = {
  status: ActionStatus.queued,
  type: ActionType.reallocate,
  deploymentID: subgraphDeployment1,
  allocationID: '0x000009a610d8b4fd4d1e020e22cc55a623fe7d2a',
  poi: '0x0000000000000000000000000000000000000000000000000000000000000000',
  amount: undefined,
  force: false,
  source: 'indexerAgent',
  reason: 'indexingRule',
  priority: 0,
  protocolNetwork: 'sepolia',
} as ActionInput
