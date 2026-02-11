import { describe, it, expect, beforeEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import * as path from 'path';
import { SandboxController } from '../builder.js';
import { EnvironmentType } from '../types.js';

// fsモジュールとchild_processをモック
vi.mock('fs', () => ({
  promises: {
    access: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn()
  }
}));

vi.mock('child_process', () => ({
  exec: vi.fn()
}));

vi.mock('util', () => ({
  promisify: (fn: any) => fn
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
