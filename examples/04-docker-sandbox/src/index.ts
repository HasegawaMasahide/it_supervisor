import { SandboxBuilder, IsolationLevel } from '@it-supervisor/sandbox-builder';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  console.log('=== Docker Sandbox Example ===\n');

  // Note: This example requires Docker to be installed and running
  console.log('Prerequisites: Docker must be installed and running\n');

  // 1. Initialize the builder
  const builder = new SandboxBuilder();

  // For this example, we'll use the parent monorepo as the target
  const projectPath = path.resolve(__dirname, '../../..');

  try {
    // 2. Detect project environment
    console.log('Step 1: Detecting project environment...\n');

    const detection = await builder.detect(projectPath);

    console.log('Detection Results:');
    console.log(`  Primary Language: ${detection.language}`);
    console.log(`  Runtime: ${detection.runtime || 'Unknown'}`);
    console.log(`  Package Manager: ${detection.packageManager || 'Unknown'}`);
    console.log(`  Databases Detected: ${detection.databases.join(', ') || 'None'}`);

    if (detection.frameworks.length > 0) {
      console.log(`  Frameworks: ${detection.frameworks.join(', ')}`);
    }

    // 3. Build Docker configuration
    console.log('\nStep 2: Building Docker configuration...\n');

    const dockerConfig = await builder.build({
      projectPath,
      isolation: IsolationLevel.Medium,
      enableCache: true,
      customPorts: [8080, 3000],
    });

    console.log('Docker Configuration Generated:');
    console.log(`  Services: ${Object.keys(dockerConfig.services).length}`);

    // Display main service configuration
    const mainService = dockerConfig.services[Object.keys(dockerConfig.services)[0]];
    if (mainService) {
      console.log(`\nMain Service Configuration:`);
      console.log(`  Image: ${mainService.image}`);
      console.log(`  Working Directory: ${mainService.working_dir || '/app'}`);

      if (mainService.ports && mainService.ports.length > 0) {
        console.log(`  Exposed Ports: ${mainService.ports.join(', ')}`);
      }

      if (mainService.environment) {
        console.log(`  Environment Variables: ${Object.keys(mainService.environment).length}`);
      }

      if (mainService.volumes && mainService.volumes.length > 0) {
        console.log(`  Volumes: ${mainService.volumes.length}`);
      }
    }

    // 4. Display docker-compose.yml preview
    console.log('\n=== docker-compose.yml Preview ===\n');
    console.log('```yaml');
    console.log(`version: '${dockerConfig.version}'`);
    console.log('services:');

    for (const [serviceName, service] of Object.entries(dockerConfig.services)) {
      console.log(`  ${serviceName}:`);
      console.log(`    image: ${service.image}`);

      if (service.container_name) {
        console.log(`    container_name: ${service.container_name}`);
      }

      if (service.ports && service.ports.length > 0) {
        console.log(`    ports:`);
        service.ports.forEach(port => {
          console.log(`      - "${port}"`);
        });
      }

      if (service.networks && service.networks.length > 0) {
        console.log(`    networks:`);
        service.networks.forEach(network => {
          console.log(`      - ${network}`);
        });
      }

      console.log('');
    }

    if (dockerConfig.networks) {
      console.log('networks:');
      for (const [networkName, network] of Object.entries(dockerConfig.networks)) {
        console.log(`  ${networkName}:`);
        console.log(`    driver: ${network.driver || 'bridge'}`);
      }
    }

    console.log('```\n');

    // 5. Usage instructions
    console.log('=== Usage Instructions ===\n');
    console.log('To use this configuration:');
    console.log('  1. Save the configuration to docker-compose.yml');
    console.log('  2. Run: docker-compose up -d');
    console.log('  3. Check status: docker-compose ps');
    console.log('  4. View logs: docker-compose logs -f');
    console.log('  5. Stop: docker-compose down\n');

    // 6. Advanced features
    console.log('=== Advanced Features ===\n');
    console.log('Available sandbox operations:');
    console.log('  - Environment detection (detect)');
    console.log('  - Docker config generation (build)');
    console.log('  - Container lifecycle management (start, stop, restart)');
    console.log('  - Log streaming (streamLogs)');
    console.log('  - Command execution (exec)');
    console.log('  - Health checks (healthCheck)');
    console.log('  - Snapshot management (snapshot, restore)');

    console.log('\n✓ Sandbox configuration completed successfully');
    console.log('\nNote: To actually create and run the sandbox, use SandboxController');
    console.log('      See the sandbox-builder API documentation for details.');

  } catch (error) {
    console.error('\n✗ Sandbox creation failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run the example
main().catch(console.error);
