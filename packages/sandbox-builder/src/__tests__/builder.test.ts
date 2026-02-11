import { describe, it, expect, beforeEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import * as path from 'path';
import { SandboxBuilder } from '../builder.js';
import { EnvironmentType, DatabaseType } from '../types.js';

// fsモジュールをモック
vi.mock('fs', () => ({
  promises: {
    access: vi.fn(),
    readFile: vi.fn(),
    readdir: vi.fn(),
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    copyFile: vi.fn()
  }
}));

describe('SandboxBuilder - detect()', () => {
  let builder: SandboxBuilder;

  beforeEach(() => {
    builder = new SandboxBuilder();
    vi.clearAllMocks();
  });

  describe('Node.js プロジェクトの検出', () => {
    it('基本的なNode.jsプロジェクトを検出できる', async () => {
      // Arrange
      const targetPath = '/test/nodejs-project';
      const packageJson = {
        name: 'test-app',
        version: '1.0.0',
        dependencies: {}
      };

      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('package.json')) return;
        if (pathStr === '/test/nodejs-project') return;
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readFile).mockImplementation(async (path: any) => {
        if (String(path).includes('package.json')) {
          return JSON.stringify(packageJson);
        }
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readdir).mockResolvedValue([] as any);

      // Act
      const result = await builder.detect(targetPath);

      // Assert
      expect(result.type).toBe(EnvironmentType.NodeJS);
      expect(result.confidence).toBe(0.9);
      expect(result.details.runtime).toBe('Node.js');
      expect(result.details.packageManager).toBe('npm');
      expect(result.ports).toEqual([8000]); // デフォルトポート
    });

    it('TypeScriptプロジェクトを検出できる', async () => {
      const targetPath = '/test/typescript-project';
      const packageJson = {
        name: 'test-app',
        dependencies: {
          typescript: '^5.0.0'
        }
      };

      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('package.json')) return;
        if (pathStr === '/test/typescript-project') return;
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readFile).mockImplementation(async (path: any) => {
        if (String(path).includes('package.json')) {
          return JSON.stringify(packageJson);
        }
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readdir).mockResolvedValue([] as any);

      const result = await builder.detect(targetPath);

      expect(result.type).toBe(EnvironmentType.NodeJS);
      expect(result.details.framework).toBe('TypeScript');
    });

    it('Expressプロジェクトを検出し、ポート3000を設定する', async () => {
      const targetPath = '/test/express-project';
      const packageJson = {
        name: 'test-app',
        dependencies: {
          express: '^4.18.0'
        }
      };

      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('package.json')) return;
        if (pathStr === '/test/express-project') return;
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readFile).mockImplementation(async (path: any) => {
        if (String(path).includes('package.json')) {
          return JSON.stringify(packageJson);
        }
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readdir).mockResolvedValue([] as any);

      const result = await builder.detect(targetPath);

      expect(result.type).toBe(EnvironmentType.NodeJS);
      expect(result.details.framework).toBe('Express');
      expect(result.ports).toEqual([3000]);
    });

    it('Next.jsプロジェクトを検出し、ポート3000を設定する', async () => {
      const targetPath = '/test/nextjs-project';
      const packageJson = {
        name: 'test-app',
        dependencies: {
          next: '^14.0.0',
          react: '^18.0.0'
        }
      };

      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('package.json')) return;
        if (pathStr === '/test/nextjs-project') return;
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readFile).mockImplementation(async (path: any) => {
        if (String(path).includes('package.json')) {
          return JSON.stringify(packageJson);
        }
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readdir).mockResolvedValue([] as any);

      const result = await builder.detect(targetPath);

      expect(result.type).toBe(EnvironmentType.NodeJS);
      expect(result.details.framework).toBe('Next.js');
      expect(result.ports).toEqual([3000]);
    });
  });

  describe('PHP プロジェクトの検出', () => {
    it('基本的なPHPプロジェクトを検出できる', async () => {
      const targetPath = '/test/php-project';
      const composerJson = {
        name: 'test/php-app',
        require: {}
      };

      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('composer.json')) return;
        if (pathStr === '/test/php-project') return;
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readFile).mockImplementation(async (path: any) => {
        if (String(path).includes('composer.json')) {
          return JSON.stringify(composerJson);
        }
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readdir).mockResolvedValue([] as any);

      const result = await builder.detect(targetPath);

      expect(result.type).toBe(EnvironmentType.PHP);
      expect(result.confidence).toBe(0.9);
      expect(result.details.runtime).toBe('PHP');
      expect(result.details.packageManager).toBe('composer');
      expect(result.ports).toEqual([8000]);
    });

    it('Laravelプロジェクトを検出できる', async () => {
      const targetPath = '/test/laravel-project';
      const composerJson = {
        name: 'test/laravel-app',
        require: {
          'laravel/framework': '^10.0'
        }
      };

      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('composer.json')) return;
        if (pathStr === '/test/laravel-project') return;
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readFile).mockImplementation(async (path: any) => {
        if (String(path).includes('composer.json')) {
          return JSON.stringify(composerJson);
        }
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readdir).mockResolvedValue([] as any);

      const result = await builder.detect(targetPath);

      expect(result.type).toBe(EnvironmentType.PHP);
      expect(result.details.framework).toBe('Laravel');
      expect(result.ports).toEqual([8000]);
    });
  });

  describe('Python プロジェクトの検出', () => {
    it('基本的なPythonプロジェクトを検出できる', async () => {
      const targetPath = '/test/python-project';

      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('requirements.txt')) return;
        if (pathStr === '/test/python-project') return;
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readFile).mockImplementation(async (path: any) => {
        if (String(path).includes('requirements.txt')) {
          return 'requests==2.28.0\npandas==1.5.0';
        }
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readdir).mockResolvedValue([] as any);

      const result = await builder.detect(targetPath);

      expect(result.type).toBe(EnvironmentType.Python);
      expect(result.confidence).toBe(0.8);
      expect(result.details.runtime).toBe('Python');
      expect(result.details.packageManager).toBe('pip');
      expect(result.ports).toEqual([5000]);
    });

    it('Djangoプロジェクトを検出できる', async () => {
      const targetPath = '/test/django-project';

      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('requirements.txt')) return;
        if (pathStr === '/test/django-project') return;
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readFile).mockImplementation(async (path: any) => {
        if (String(path).includes('requirements.txt')) {
          return 'django==4.2.0\npsycopg2==2.9.0';
        }
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readdir).mockResolvedValue([] as any);

      const result = await builder.detect(targetPath);

      expect(result.type).toBe(EnvironmentType.Python);
      expect(result.details.framework).toBe('Django');
      expect(result.ports).toEqual([8000]); // Djangoはポート8000
    });

    it('Flaskプロジェクトを検出できる', async () => {
      const targetPath = '/test/flask-project';

      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('requirements.txt')) return;
        if (pathStr === '/test/flask-project') return;
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readFile).mockImplementation(async (path: any) => {
        if (String(path).includes('requirements.txt')) {
          return 'flask==2.3.0\ngunicorn==20.1.0';
        }
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readdir).mockResolvedValue([] as any);

      const result = await builder.detect(targetPath);

      expect(result.type).toBe(EnvironmentType.Python);
      expect(result.details.framework).toBe('Flask');
      expect(result.ports).toEqual([5000]);
    });
  });

  describe('その他のプロジェクトタイプの検出', () => {
    it('.NETプロジェクトを検出できる', async () => {
      const targetPath = '/test/dotnet-project';

      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr === '/test/dotnet-project') return;
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readdir).mockResolvedValue(['MyApp.csproj', 'Program.cs'] as any);

      const result = await builder.detect(targetPath);

      expect(result.type).toBe(EnvironmentType.DotNet);
      expect(result.confidence).toBe(0.9);
      expect(result.details.runtime).toBe('.NET');
      expect(result.ports).toEqual([5000]);
    });

    it('Javaプロジェクトを検出できる', async () => {
      const targetPath = '/test/java-project';

      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('pom.xml')) return;
        if (pathStr === '/test/java-project') return;
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readdir).mockResolvedValue([] as any);

      const result = await builder.detect(targetPath);

      expect(result.type).toBe(EnvironmentType.Java);
      expect(result.confidence).toBe(0.9);
      expect(result.details.runtime).toBe('Java');
      expect(result.details.packageManager).toBe('Maven');
      expect(result.ports).toEqual([8080]);
    });

    it('Rubyプロジェクトを検出できる', async () => {
      const targetPath = '/test/ruby-project';

      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('Gemfile')) return;
        if (pathStr === '/test/ruby-project') return;
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readFile).mockImplementation(async (path: any) => {
        if (String(path).includes('Gemfile')) {
          return 'source "https://rubygems.org"\ngem "sinatra"';
        }
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readdir).mockResolvedValue([] as any);

      const result = await builder.detect(targetPath);

      expect(result.type).toBe(EnvironmentType.Ruby);
      expect(result.confidence).toBe(0.9);
      expect(result.details.runtime).toBe('Ruby');
      expect(result.details.packageManager).toBe('bundler');
      expect(result.ports).toEqual([3000]);
    });

    it('Ruby on Railsプロジェクトを検出できる', async () => {
      const targetPath = '/test/rails-project';

      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('Gemfile')) return;
        if (pathStr === '/test/rails-project') return;
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readFile).mockImplementation(async (path: any) => {
        if (String(path).includes('Gemfile')) {
          return 'source "https://rubygems.org"\ngem "rails", "~> 7.0"';
        }
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readdir).mockResolvedValue([] as any);

      const result = await builder.detect(targetPath);

      expect(result.type).toBe(EnvironmentType.Ruby);
      expect(result.details.framework).toBe('Ruby on Rails');
    });
  });

  describe('データベースの検出', () => {
    it('PostgreSQLを検出できる', async () => {
      const targetPath = '/test/nodejs-pg';
      const packageJson = {
        name: 'test-app',
        dependencies: {
          pg: '^8.11.0'
        }
      };

      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('package.json')) return;
        if (pathStr === '/test/nodejs-pg') return;
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readFile).mockImplementation(async (path: any) => {
        if (String(path).includes('package.json')) {
          return JSON.stringify(packageJson);
        }
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readdir).mockResolvedValue([] as any);

      const result = await builder.detect(targetPath);

      expect(result.databases).toContain(DatabaseType.PostgreSQL);
    });

    it('MySQLを検出できる', async () => {
      const targetPath = '/test/nodejs-mysql';
      const packageJson = {
        name: 'test-app',
        dependencies: {
          mysql: '^2.18.0'
        }
      };

      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('package.json')) return;
        if (pathStr === '/test/nodejs-mysql') return;
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readFile).mockImplementation(async (path: any) => {
        if (String(path).includes('package.json')) {
          return JSON.stringify(packageJson);
        }
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readdir).mockResolvedValue([] as any);

      const result = await builder.detect(targetPath);

      expect(result.databases).toContain(DatabaseType.MySQL);
    });

    it('MongoDBを検出できる', async () => {
      const targetPath = '/test/nodejs-mongodb';
      const packageJson = {
        name: 'test-app',
        dependencies: {
          mongodb: '^5.7.0'
        }
      };

      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('package.json')) return;
        if (pathStr === '/test/nodejs-mongodb') return;
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readFile).mockImplementation(async (path: any) => {
        if (String(path).includes('package.json')) {
          return JSON.stringify(packageJson);
        }
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readdir).mockResolvedValue([] as any);

      const result = await builder.detect(targetPath);

      expect(result.databases).toContain(DatabaseType.MongoDB);
    });

    it('Redisを検出できる', async () => {
      const targetPath = '/test/nodejs-redis';
      const packageJson = {
        name: 'test-app',
        dependencies: {
          redis: '^4.6.0'
        }
      };

      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('package.json')) return;
        if (pathStr === '/test/nodejs-redis') return;
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readFile).mockImplementation(async (path: any) => {
        if (String(path).includes('package.json')) {
          return JSON.stringify(packageJson);
        }
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readdir).mockResolvedValue([] as any);

      const result = await builder.detect(targetPath);

      expect(result.databases).toContain(DatabaseType.Redis);
    });

    it('PHPプロジェクトでMySQLを検出できる', async () => {
      const targetPath = '/test/php-mysql';
      const composerJson = {
        name: 'test/php-app',
        require: {
          'doctrine/dbal': '^3.6'
        }
      };

      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('composer.json')) return;
        if (pathStr === '/test/php-mysql') return;
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readFile).mockImplementation(async (path: any) => {
        if (String(path).includes('composer.json')) {
          return JSON.stringify(composerJson);
        }
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readdir).mockResolvedValue([] as any);

      const result = await builder.detect(targetPath);

      expect(result.databases).toContain(DatabaseType.MySQL);
    });

    it('複数のデータベースを検出できる', async () => {
      const targetPath = '/test/nodejs-multidb';
      const packageJson = {
        name: 'test-app',
        dependencies: {
          pg: '^8.11.0',
          redis: '^4.6.0',
          mongodb: '^5.7.0'
        }
      };

      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('package.json')) return;
        if (pathStr === '/test/nodejs-multidb') return;
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readFile).mockImplementation(async (path: any) => {
        if (String(path).includes('package.json')) {
          return JSON.stringify(packageJson);
        }
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readdir).mockResolvedValue([] as any);

      const result = await builder.detect(targetPath);

      expect(result.databases).toContain(DatabaseType.PostgreSQL);
      expect(result.databases).toContain(DatabaseType.Redis);
      expect(result.databases).toContain(DatabaseType.MongoDB);
      expect(result.databases.length).toBe(3);
    });
  });

  describe('Docker関連ファイルの検出', () => {
    it('Dockerfileの有無を検出できる', async () => {
      const targetPath = '/test/docker-project';

      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('Dockerfile')) return;
        if (pathStr === '/test/docker-project') return;
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readdir).mockResolvedValue([] as any);

      const result = await builder.detect(targetPath);

      expect(result.hasDocker).toBe(true);
      expect(result.hasDockerCompose).toBe(false);
    });

    it('docker-compose.ymlの有無を検出できる', async () => {
      const targetPath = '/test/docker-compose-project';

      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('docker-compose.yml')) return;
        if (pathStr === '/test/docker-compose-project') return;
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readdir).mockResolvedValue([] as any);

      const result = await builder.detect(targetPath);

      expect(result.hasDocker).toBe(false);
      expect(result.hasDockerCompose).toBe(true);
    });

    it('DockerfileとDocker Composeの両方を検出できる', async () => {
      const targetPath = '/test/full-docker-project';

      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('Dockerfile') || pathStr.includes('docker-compose.yml')) return;
        if (pathStr === '/test/full-docker-project') return;
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readdir).mockResolvedValue([] as any);

      const result = await builder.detect(targetPath);

      expect(result.hasDocker).toBe(true);
      expect(result.hasDockerCompose).toBe(true);
    });
  });

  describe('不明なプロジェクトと空ディレクトリ', () => {
    it('特定のマーカーファイルがない場合、Unknownを返す', async () => {
      const targetPath = '/test/unknown-project';

      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr === '/test/unknown-project') return;
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readdir).mockResolvedValue(['index.html', 'style.css'] as any);

      const result = await builder.detect(targetPath);

      expect(result.type).toBe(EnvironmentType.Unknown);
      expect(result.confidence).toBe(0);
      expect(result.ports).toEqual([8000]); // デフォルトポート
    });

    it('空のディレクトリの場合、Unknownを返す', async () => {
      const targetPath = '/test/empty-directory';

      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr === '/test/empty-directory') return;
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readdir).mockResolvedValue([] as any);

      const result = await builder.detect(targetPath);

      expect(result.type).toBe(EnvironmentType.Unknown);
      expect(result.confidence).toBe(0);
    });
  });

  describe('エラーハンドリング', () => {
    it('存在しないディレクトリの場合、エラーをスローする', async () => {
      const targetPath = '/test/nonexistent';

      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));

      await expect(builder.detect(targetPath)).rejects.toThrow('Target path not found');
    });

    it('不正なJSONのpackage.jsonの場合、基本情報のみ設定する', async () => {
      const targetPath = '/test/invalid-json';

      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('package.json')) return;
        if (pathStr === '/test/invalid-json') return;
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readFile).mockImplementation(async (path: any) => {
        if (String(path).includes('package.json')) {
          return '{ invalid json }';
        }
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readdir).mockResolvedValue([] as any);

      const result = await builder.detect(targetPath);

      expect(result.type).toBe(EnvironmentType.NodeJS);
      expect(result.details.runtime).toBe('Node.js');
      expect(result.details.packageManager).toBe('npm');
      expect(result.details.error).toBe('Failed to parse package.json');
    });

    it('不正なJSONのcomposer.jsonの場合、基本情報のみ設定する', async () => {
      const targetPath = '/test/invalid-composer';

      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('composer.json')) return;
        if (pathStr === '/test/invalid-composer') return;
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readFile).mockImplementation(async (path: any) => {
        if (String(path).includes('composer.json')) {
          return '{ "name": "test", invalid }';
        }
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readdir).mockResolvedValue([] as any);

      const result = await builder.detect(targetPath);

      expect(result.type).toBe(EnvironmentType.PHP);
      expect(result.details.runtime).toBe('PHP');
      expect(result.details.packageManager).toBe('composer');
      expect(result.details.error).toBe('Failed to parse composer.json');
    });
  });
});

describe('SandboxBuilder - build()', () => {
  let builder: SandboxBuilder;

  beforeEach(() => {
    builder = new SandboxBuilder();
    vi.clearAllMocks();
  });

  describe('Docker設定の生成', () => {
    it('Node.jsプロジェクトの基本的なDocker設定を生成できる', async () => {
      // Arrange
      const targetPath = '/test/nodejs-project';
      const outputDir = '/test/output';
      const packageJson = {
        name: 'test-app',
        version: '1.0.0',
        dependencies: {}
      };

      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('package.json')) return;
        if (pathStr === targetPath) return;
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readFile).mockImplementation(async (path: any) => {
        if (String(path).includes('package.json')) {
          return JSON.stringify(packageJson);
        }
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readdir).mockResolvedValue([] as any);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      // Act
      const result = await builder.build(targetPath, { outputDir });

      // Assert
      expect(result.type).toBe(EnvironmentType.NodeJS);
      expect(result.status).toBe('stopped');
      expect(result.services).toContain('app');
      expect(vi.mocked(fs.mkdir)).toHaveBeenCalledWith(outputDir, { recursive: true });

      // Dockerfileが生成されたことを確認
      const dockerfileCalls = (vi.mocked(fs.writeFile).mock.calls as any[]).filter(
        call => String(call[0]).includes('Dockerfile')
      );
      expect(dockerfileCalls.length).toBeGreaterThan(0);

      const dockerfileContent = dockerfileCalls[0][1];
      expect(dockerfileContent).toContain('FROM node:18-alpine');
      expect(dockerfileContent).toContain('WORKDIR /app');
      expect(dockerfileContent).toContain('npm install');
    });

    it('PHPプロジェクトの基本的なDocker設定を生成できる', async () => {
      const targetPath = '/test/php-project';
      const outputDir = '/test/output';
      const composerJson = {
        name: 'test/php-app',
        require: {}
      };

      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('composer.json')) return;
        if (pathStr === targetPath) return;
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readFile).mockImplementation(async (path: any) => {
        if (String(path).includes('composer.json')) {
          return JSON.stringify(composerJson);
        }
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readdir).mockResolvedValue([] as any);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await builder.build(targetPath, { outputDir });

      expect(result.type).toBe(EnvironmentType.PHP);

      const dockerfileCalls = (vi.mocked(fs.writeFile).mock.calls as any[]).filter(
        call => String(call[0]).includes('Dockerfile')
      );
      const dockerfileContent = dockerfileCalls[0][1];
      expect(dockerfileContent).toContain('FROM php:8.2-fpm');
      expect(dockerfileContent).toContain('composer install');
    });

    it('Pythonプロジェクトの基本的なDocker設定を生成できる', async () => {
      const targetPath = '/test/python-project';
      const outputDir = '/test/output';

      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('requirements.txt')) return;
        if (pathStr === targetPath) return;
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readFile).mockImplementation(async (path: any) => {
        if (String(path).includes('requirements.txt')) {
          return 'flask==2.3.0';
        }
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readdir).mockResolvedValue([] as any);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await builder.build(targetPath, { outputDir });

      expect(result.type).toBe(EnvironmentType.Python);

      const dockerfileCalls = (vi.mocked(fs.writeFile).mock.calls as any[]).filter(
        call => String(call[0]).includes('Dockerfile')
      );
      const dockerfileContent = dockerfileCalls[0][1];
      expect(dockerfileContent).toContain('FROM python:3.11-slim');
      expect(dockerfileContent).toContain('pip install --no-cache-dir -r requirements.txt');
    });
  });

  describe('データベース設定', () => {
    it('PostgreSQLデータベースサービスを追加できる', async () => {
      const targetPath = '/test/nodejs-pg';
      const outputDir = '/test/output';
      const packageJson = {
        name: 'test-app',
        dependencies: {
          pg: '^8.11.0'
        }
      };

      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('package.json')) return;
        if (pathStr === targetPath) return;
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readFile).mockImplementation(async (path: any) => {
        if (String(path).includes('package.json')) {
          return JSON.stringify(packageJson);
        }
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readdir).mockResolvedValue([] as any);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await builder.build(targetPath, {
        outputDir,
        includeDatabase: true
      });

      expect(result.services).toContain('app');
      expect(result.services).toContain('db');

      // Docker Composeファイルにdb設定が含まれることを確認
      const composeCalls = (vi.mocked(fs.writeFile).mock.calls as any[]).filter(
        call => String(call[0]).includes('docker-compose.yml')
      );
      const composeContent = composeCalls[0][1];
      expect(composeContent).toContain('postgres:15-alpine');
      expect(composeContent).toContain('POSTGRES_DB');
      expect(composeContent).toContain('db-data');
    });

    it('MySQLデータベースサービスを追加できる', async () => {
      const targetPath = '/test/php-mysql';
      const outputDir = '/test/output';
      const composerJson = {
        name: 'test/php-app',
        require: {
          'doctrine/dbal': '^3.6'
        }
      };

      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('composer.json')) return;
        if (pathStr === targetPath) return;
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readFile).mockImplementation(async (path: any) => {
        if (String(path).includes('composer.json')) {
          return JSON.stringify(composerJson);
        }
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readdir).mockResolvedValue([] as any);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await builder.build(targetPath, {
        outputDir,
        includeDatabase: true
      });

      expect(result.services).toContain('db');

      const composeCalls = (vi.mocked(fs.writeFile).mock.calls as any[]).filter(
        call => String(call[0]).includes('docker-compose.yml')
      );
      const composeContent = composeCalls[0][1];
      expect(composeContent).toContain('mysql:8.0');
      expect(composeContent).toContain('MYSQL_DATABASE');
    });

    it('includeDatabase=falseの場合、データベースを追加しない', async () => {
      const targetPath = '/test/nodejs-pg';
      const outputDir = '/test/output';
      const packageJson = {
        name: 'test-app',
        dependencies: {
          pg: '^8.11.0'
        }
      };

      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('package.json')) return;
        if (pathStr === targetPath) return;
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readFile).mockImplementation(async (path: any) => {
        if (String(path).includes('package.json')) {
          return JSON.stringify(packageJson);
        }
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readdir).mockResolvedValue([] as any);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await builder.build(targetPath, {
        outputDir,
        includeDatabase: false
      });

      expect(result.services).not.toContain('db');
      expect(result.services).toEqual(['app']);
    });
  });

  describe('環境変数とポート設定', () => {
    it('カスタム環境変数を設定できる', async () => {
      const targetPath = '/test/nodejs-project';
      const outputDir = '/test/output';
      const packageJson = {
        name: 'test-app',
        dependencies: {}
      };

      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('package.json')) return;
        if (pathStr === targetPath) return;
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readFile).mockImplementation(async (path: any) => {
        if (String(path).includes('package.json')) {
          return JSON.stringify(packageJson);
        }
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readdir).mockResolvedValue([] as any);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await builder.build(targetPath, {
        outputDir,
        environment: {
          NODE_ENV: 'production',
          API_KEY: 'test-key'
        }
      });

      const composeCalls = (vi.mocked(fs.writeFile).mock.calls as any[]).filter(
        call => String(call[0]).includes('docker-compose.yml')
      );
      const composeContent = composeCalls[0][1];
      expect(composeContent).toContain('NODE_ENV: production');
      expect(composeContent).toContain('API_KEY: test-key');
    });

    it('検出されたポートがDocker Composeに反映される', async () => {
      const targetPath = '/test/express-project';
      const outputDir = '/test/output';
      const packageJson = {
        name: 'test-app',
        dependencies: {
          express: '^4.18.0'
        }
      };

      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('package.json')) return;
        if (pathStr === targetPath) return;
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readFile).mockImplementation(async (path: any) => {
        if (String(path).includes('package.json')) {
          return JSON.stringify(packageJson);
        }
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readdir).mockResolvedValue([] as any);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await builder.build(targetPath, { outputDir });

      const composeCalls = (vi.mocked(fs.writeFile).mock.calls as any[]).filter(
        call => String(call[0]).includes('docker-compose.yml')
      );
      const composeContent = composeCalls[0][1];
      expect(composeContent).toContain('3000:3000');
    });
  });

  describe('既存のDockerファイル利用', () => {
    it('useExistingDocker=trueかつdocker-compose.ymlが存在する場合、既存ファイルをコピーする', async () => {
      const targetPath = '/test/docker-project';
      const outputDir = '/test/output';

      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('docker-compose.yml')) return;
        if (pathStr === targetPath) return;
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readdir).mockResolvedValue([] as any);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.copyFile).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await builder.build(targetPath, {
        outputDir,
        useExistingDocker: true
      });

      expect(vi.mocked(fs.copyFile)).toHaveBeenCalledWith(
        expect.stringContaining('docker-compose.yml'),
        expect.stringContaining('docker-compose.yml')
      );
    });

    it('useExistingDocker=falseの場合、新しいDocker設定を生成する', async () => {
      const targetPath = '/test/docker-project';
      const outputDir = '/test/output';

      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('docker-compose.yml')) return;
        if (pathStr === targetPath) return;
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readdir).mockResolvedValue([] as any);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.copyFile).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await builder.build(targetPath, {
        outputDir,
        useExistingDocker: false
      });

      // copyFileではなくwriteFileが呼ばれるべき
      const composeCalls = (vi.mocked(fs.writeFile).mock.calls as any[]).filter(
        call => String(call[0]).includes('docker-compose.yml')
      );
      expect(composeCalls.length).toBeGreaterThan(0);
    });
  });

  describe('ファイル生成の検証', () => {
    it('sandbox.jsonメタデータが正しく生成される', async () => {
      const targetPath = '/test/nodejs-project';
      const outputDir = '/test/output';
      const packageJson = {
        name: 'test-app',
        dependencies: {}
      };

      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('package.json')) return;
        if (pathStr === targetPath) return;
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readFile).mockImplementation(async (path: any) => {
        if (String(path).includes('package.json')) {
          return JSON.stringify(packageJson);
        }
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readdir).mockResolvedValue([] as any);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await builder.build(targetPath, { outputDir });

      const sandboxCalls = (vi.mocked(fs.writeFile).mock.calls as any[]).filter(
        call => String(call[0]).includes('sandbox.json')
      );
      expect(sandboxCalls.length).toBe(1);

      const sandboxContent = JSON.parse(sandboxCalls[0][1]);
      expect(sandboxContent).toHaveProperty('id');
      expect(sandboxContent).toHaveProperty('type', EnvironmentType.NodeJS);
      expect(sandboxContent).toHaveProperty('status', 'stopped');
      expect(sandboxContent).toHaveProperty('createdAt');
      expect(sandboxContent).toHaveProperty('services');
    });

    it('README.mdが生成される', async () => {
      const targetPath = '/test/nodejs-project';
      const outputDir = '/test/output';
      const packageJson = {
        name: 'test-app',
        dependencies: {}
      };

      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('package.json')) return;
        if (pathStr === targetPath) return;
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readFile).mockImplementation(async (path: any) => {
        if (String(path).includes('package.json')) {
          return JSON.stringify(packageJson);
        }
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readdir).mockResolvedValue([] as any);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await builder.build(targetPath, { outputDir });

      const readmeCalls = (vi.mocked(fs.writeFile).mock.calls as any[]).filter(
        call => String(call[0]).includes('README.md')
      );
      expect(readmeCalls.length).toBe(1);

      const readmeContent = readmeCalls[0][1];
      expect(readmeContent).toContain('Sandbox Environment');
      expect(readmeContent).toContain('docker-compose up');
    });
  });

  describe('環境タイプの上書き', () => {
    it('type指定がある場合、検出結果を上書きする', async () => {
      const targetPath = '/test/nodejs-project';
      const outputDir = '/test/output';
      const packageJson = {
        name: 'test-app',
        dependencies: {}
      };

      vi.mocked(fs.access).mockImplementation(async (path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('package.json')) return;
        if (pathStr === targetPath) return;
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readFile).mockImplementation(async (path: any) => {
        if (String(path).includes('package.json')) {
          return JSON.stringify(packageJson);
        }
        throw new Error('ENOENT');
      });

      vi.mocked(fs.readdir).mockResolvedValue([] as any);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await builder.build(targetPath, {
        outputDir,
        type: EnvironmentType.Python
      });

      expect(result.type).toBe(EnvironmentType.Python);

      const dockerfileCalls = (vi.mocked(fs.writeFile).mock.calls as any[]).filter(
        call => String(call[0]).includes('Dockerfile')
      );
      const dockerfileContent = dockerfileCalls[0][1];
      expect(dockerfileContent).toContain('FROM python:3.11-slim');
    });
  });
});
