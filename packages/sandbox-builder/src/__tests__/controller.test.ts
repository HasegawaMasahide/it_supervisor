import { describe, it, expect, beforeEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { SandboxController } from '../builder.js';
import { EnvironmentType } from '../types.js';

// fsモジュールとchild_processをモック
vi.mock('fs', () => ({
  promises: {
    access: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    readdir: vi.fn(),
    stat: vi.fn()
  }
}));

vi.mock('child_process', () => ({
  exec: vi.fn()
}));

vi.mock('util', () => ({
  promisify: (fn: any) => fn
}));

vi.mock('js-yaml', () => ({
  load: vi.fn()
}));

describe('SandboxController - load()', () => {
  let controller: SandboxController;
  const sandboxPath = '/test/sandbox';

  beforeEach(() => {
    controller = new SandboxController(sandboxPath);
    vi.clearAllMocks();
  });

  it('正常なsandbox.jsonを読み込める', async () => {
    const mockSandbox = {
      id: 'test-id',
      path: sandboxPath,
      type: EnvironmentType.NodeJS,
      status: 'stopped',
      createdAt: new Date().toISOString(),
      ports: {},
      services: ['app']
    };

    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockSandbox));

    await controller.load();

    expect(vi.mocked(fs.access)).toHaveBeenCalledWith(
      path.join(sandboxPath, 'sandbox.json')
    );
    expect(vi.mocked(fs.readFile)).toHaveBeenCalledWith(
      path.join(sandboxPath, 'sandbox.json'),
      'utf-8'
    );
  });

  it('sandbox.jsonが存在しない場合、エラーをスローする', async () => {
    vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));

    await expect(controller.load()).rejects.toThrow(
      'Sandbox metadata not found at'
    );
  });

  it('不正なJSONの場合、エラーをスローする', async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockResolvedValue('{ invalid json }');

    await expect(controller.load()).rejects.toThrow(
      'Invalid JSON in sandbox metadata'
    );
  });

  it('ファイル読み込みエラーの場合、エラーをスローする', async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockRejectedValue(new Error('Permission denied'));

    await expect(controller.load()).rejects.toThrow(
      'Failed to read sandbox metadata'
    );
  });
});

describe('SandboxController - health()', () => {
  let controller: SandboxController;
  const sandboxPath = '/test/sandbox';

  beforeEach(() => {
    controller = new SandboxController(sandboxPath);
    vi.clearAllMocks();
  });

  it('空の出力の場合、適切なエラーを返す', async () => {
    const mockExecAsync = vi.fn().mockResolvedValue({ stdout: '' });
    (controller as any).execAsync = mockExecAsync;

    const result = await controller.health();

    expect(result.healthy).toBe(false);
    expect(result.error).toBe('No containers found');
  });

  it('不正なJSON出力の場合、適切なエラーを返す', async () => {
    const mockExecAsync = vi.fn().mockResolvedValue({
      stdout: '{ invalid json }'
    });
    (controller as any).execAsync = mockExecAsync;

    const result = await controller.health();

    expect(result.healthy).toBe(false);
    expect(result.error).toContain('Failed to parse docker-compose output');
  });

  it('実行エラーの場合、エラー情報を返す', async () => {
    const mockExecAsync = vi.fn().mockRejectedValue(new Error('Docker not running'));
    (controller as any).execAsync = mockExecAsync;

    const result = await controller.health();

    expect(result.healthy).toBe(false);
    expect(result.error).toContain('Docker not running');
  });

  it('正常なコンテナ情報をパースできる', async () => {
    const mockOutput = JSON.stringify({ Service: 'app', State: 'running' });
    const mockExecAsync = vi.fn().mockResolvedValue({ stdout: mockOutput });
    (controller as any).execAsync = mockExecAsync;

    const result = await controller.health();

    expect(result.healthy).toBe(true);
    expect(result.services).toHaveProperty('app');
    expect(result.services.app.status).toBe('healthy');
  });

  it('停止中のコンテナをunhealthyとマークする', async () => {
    const mockOutput = JSON.stringify({ Service: 'app', State: 'exited' });
    const mockExecAsync = vi.fn().mockResolvedValue({ stdout: mockOutput });
    (controller as any).execAsync = mockExecAsync;

    const result = await controller.health();

    expect(result.healthy).toBe(false);
    expect(result.services.app.status).toBe('unhealthy');
  });
});

describe('SandboxController - createSnapshot()', () => {
  let controller: SandboxController;
  const sandboxPath = '/test/sandbox';

  beforeEach(() => {
    controller = new SandboxController(sandboxPath);
    vi.clearAllMocks();
  });

  it('タイムスタンプ付きスナップショットを作成できる', async () => {
    const mockComposeConfig = {
      volumes: {
        'db-data': {},
        'app-data': {}
      }
    };

    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockResolvedValue('version: "3"');
    vi.mocked(yaml.load).mockReturnValue(mockComposeConfig);
    vi.mocked(fs.stat).mockResolvedValue({ size: 1024 } as any);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);

    const mockExecAsync = vi.fn().mockResolvedValue({ stdout: '' });
    (controller as any).execAsync = mockExecAsync;

    const snapshot = await controller.createSnapshot('test-backup');

    expect(snapshot.name).toMatch(/^test-backup-\d{4}-\d{2}-\d{2}/);
    expect(snapshot.size).toBeGreaterThan(0);
    expect(snapshot.description).toContain('test-backup');
    expect(mockExecAsync).toHaveBeenCalledWith('docker-compose pause', expect.any(Object));
    expect(mockExecAsync).toHaveBeenCalledWith('docker-compose unpause', expect.any(Object));
  });

  it('ボリュームが存在しない場合でもスナップショットを作成できる', async () => {
    const mockComposeConfig = {
      volumes: {}
    };

    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockResolvedValue('version: "3"');
    vi.mocked(yaml.load).mockReturnValue(mockComposeConfig);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);

    const mockExecAsync = vi.fn().mockResolvedValue({ stdout: '' });
    (controller as any).execAsync = mockExecAsync;

    const snapshot = await controller.createSnapshot('empty-backup');

    expect(snapshot.name).toMatch(/^empty-backup-\d{4}-\d{2}-\d{2}/);
    expect(snapshot.size).toBe(0);
  });
});

describe('SandboxController - restoreSnapshot()', () => {
  let controller: SandboxController;
  const sandboxPath = '/test/sandbox';

  beforeEach(() => {
    controller = new SandboxController(sandboxPath);
    vi.clearAllMocks();
  });

  it('最新のスナップショットから復元できる', async () => {
    const snapshotName = 'test-backup';
    const mockSnapshotMeta = {
      name: `${snapshotName}-2024-01-01T00-00-00-000Z`,
      createdAt: new Date(),
      size: 1024,
      description: 'Test snapshot'
    };

    const mockComposeConfig = {
      volumes: {
        'db-data': {},
        'app-data': {}
      }
    };

    // 完全一致のディレクトリが見つからない場合の処理
    vi.mocked(fs.access)
      .mockRejectedValueOnce(new Error('Not found'))
      .mockResolvedValue(undefined);

    vi.mocked(fs.readdir).mockResolvedValue([
      `${snapshotName}-2024-01-01T00-00-00-000Z`,
      `${snapshotName}-2023-12-31T00-00-00-000Z`
    ] as any);

    vi.mocked(fs.readFile)
      .mockResolvedValueOnce(JSON.stringify(mockSnapshotMeta))
      .mockResolvedValueOnce('version: "3"');

    vi.mocked(yaml.load).mockReturnValue(mockComposeConfig);

    const mockExecAsync = vi.fn().mockResolvedValue({ stdout: '' });
    (controller as any).execAsync = mockExecAsync;
    (controller as any).down = vi.fn().mockResolvedValue(undefined);
    (controller as any).up = vi.fn().mockResolvedValue(undefined);

    await controller.restoreSnapshot(snapshotName);

    expect((controller as any).down).toHaveBeenCalled();
    expect((controller as any).up).toHaveBeenCalled();
    expect(mockExecAsync).toHaveBeenCalledWith(expect.stringContaining('docker volume create'));
  });

  it('スナップショットが見つからない場合、エラーをスローする', async () => {
    vi.mocked(fs.access).mockRejectedValue(new Error('Not found'));
    vi.mocked(fs.readdir).mockResolvedValue([] as any);

    await expect(controller.restoreSnapshot('nonexistent')).rejects.toThrow(
      "Snapshot 'nonexistent' not found"
    );
  });
});
