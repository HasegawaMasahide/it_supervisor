import { SandboxBuilder, IsolationLevel } from '@it-supervisor/sandbox-builder';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logger = createLogger({ name: 'example', level: LogLevel.INFO });

async function main() {
  logger.info('=== Docker Sandbox Example ===\n');

  // Note: This example requires Docker to be installed and running
  logger.info('Prerequisites: Docker must be installed and running\n');

  // 1. Initialize the builder
  const builder = new SandboxBuilder();

  // For this example, we'll use the parent monorepo as the target
  const projectPath = path.resolve(__dirname, '../../..');

  try {
    // 2. Detect project environment
    logger.info('Step 1: Detecting project environment...\n');

    const detection = await builder.detect(projectPath);

    logger.info('Detection Results:');
    logger.info(`  Primary Language: ${detection.language}`);
    logger.info(`  Runtime: ${detection.runtime || 'Unknown'}`);
    logger.info(`  Package Manager: ${detection.packageManager || 'Unknown'}`);
    logger.info(`  Databases Detected: ${detection.databases.join(', ') || 'None'}`);

    if (detection.frameworks.length > 0) {
      logger.info(`  Frameworks: ${detection.frameworks.join(', ')}`);
    }

    // 3. Build Docker configuration
    logger.info('\nStep 2: Building Docker configuration...\n');

    const dockerConfig = await builder.build({
      projectPath,
      isolation: IsolationLevel.Medium,
      enableCache: true,
      customPorts: [8080, 3000],
    });

    logger.info('Docker Configuration Generated:');
    logger.info(`  Services: ${Object.keys(dockerConfig.services).length}`);

    // Display main service configuration
    const mainService = dockerConfig.services[Object.keys(dockerConfig.services)[0]];
    if (mainService) {
      logger.info(`\nMain Service Configuration:`);
      logger.info(`  Image: ${mainService.image}`);
      logger.info(`  Working Directory: ${mainService.working_dir || '/app'}`);

      if (mainService.ports && mainService.ports.length > 0) {
        logger.info(`  Exposed Ports: ${mainService.ports.join(', ')}`);
      }

      if (mainService.environment) {
        logger.info(`  Environment Variables: ${Object.keys(mainService.environment).length}`);
      }

      if (mainService.volumes && mainService.volumes.length > 0) {
        logger.info(`  Volumes: ${mainService.volumes.length}`);
      }
    }

    // 4. Display docker-compose.yml preview
    logger.info('\n=== docker-compose.yml Preview ===\n');
    logger.info('```yaml');
    logger.info(`version: '${dockerConfig.version}'`);
    logger.info('services:');

    for (const [serviceName, service] of Object.entries(dockerConfig.services)) {
      logger.info(`  ${serviceName}:`);
      logger.info(`    image: ${service.image}`);

      if (service.container_name) {
        logger.info(`    container_name: ${service.container_name}`);
      }

      if (service.ports && service.ports.length > 0) {
        logger.info(`    ports:`);
        service.ports.forEach(port => {
          logger.info(`      - "${port}"`);
        });
      }

      if (service.networks && service.networks.length > 0) {
        logger.info(`    networks:`);
        service.networks.forEach(network => {
          logger.info(`      - ${network}`);
        });
      }

      logger.info('');
    }

    if (dockerConfig.networks) {
      logger.info('networks:');
      for (const [networkName, network] of Object.entries(dockerConfig.networks)) {
        logger.info(`  ${networkName}:`);
        logger.info(`    driver: ${network.driver || 'bridge'}`);
      }
    }

    logger.info('```\n');

    // 5. Usage instructions
    logger.info('=== Usage Instructions ===\n');
    logger.info('To use this configuration:');
    logger.info('  1. Save the configuration to docker-compose.yml');
    logger.info('  2. Run: docker-compose up -d');
    logger.info('  3. Check status: docker-compose ps');
    logger.info('  4. View logs: docker-compose logs -f');
    logger.info('  5. Stop: docker-compose down\n');

    // 6. Advanced features
    logger.info('=== Advanced Features ===\n');
    logger.info('Available sandbox operations:');
    logger.info('  - Environment detection (detect)');
    logger.info('  - Docker config generation (build)');
    logger.info('  - Container lifecycle management (start, stop, restart)');
    logger.info('  - Log streaming (streamLogs)');
    logger.info('  - Command execution (exec)');
    logger.info('  - Health checks (healthCheck)');
    logger.info('  - Snapshot management (snapshot, restore)');

    logger.info('\n✓ Sandbox configuration completed successfully');
    logger.info('\nNote: To actually create and run the sandbox, use SandboxController');
    logger.info('      See the sandbox-builder API documentation for details.');

  } catch (error) {
    logger.error('\n✗ Sandbox creation failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run the example
main().catch((err) => logger.error(err));
