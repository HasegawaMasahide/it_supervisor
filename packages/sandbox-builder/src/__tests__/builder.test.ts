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
  });
});
