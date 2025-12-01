import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  SchemaEditorBridgeManager,
  BubbleHandler,
} from '../../../src/Bubble/schema-editor/SchemaEditorBridgeManager';

/** Mock @schema-editor/host-sdk */
vi.mock('@schema-editor/host-sdk/core', () => ({
  createSchemaEditorBridge: vi.fn(() => {
    return vi.fn(); // 返回 cleanup 函数
  }),
}));

describe('SchemaEditorBridgeManager', () => {
  beforeEach(() => {
    /** 每个测试前销毁单例，确保测试隔离 */
    SchemaEditorBridgeManager.destroy();
  });

  afterEach(() => {
    /** 清理 */
    SchemaEditorBridgeManager.destroy();
    vi.clearAllMocks();
  });

  describe('单例模式', () => {
    it('getInstance 应该返回同一个实例', () => {
      const instance1 = SchemaEditorBridgeManager.getInstance();
      const instance2 = SchemaEditorBridgeManager.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('destroy 后 getInstance 应该返回新实例', () => {
      const instance1 = SchemaEditorBridgeManager.getInstance();
      SchemaEditorBridgeManager.destroy();
      const instance2 = SchemaEditorBridgeManager.getInstance();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('register / unregister', () => {
    it('应该正确注册 handler', () => {
      const manager = SchemaEditorBridgeManager.getInstance();
      const handler: BubbleHandler = {
        getContent: () => 'test content',
        setContent: vi.fn(),
      };

      manager.register('test-id', handler);

      expect(manager.has('test-id')).toBe(true);
      expect(manager.getRegistrySize()).toBe(1);
    });

    it('应该正确注销 handler', () => {
      const manager = SchemaEditorBridgeManager.getInstance();
      const handler: BubbleHandler = {
        getContent: () => 'test content',
        setContent: vi.fn(),
      };

      manager.register('test-id', handler);
      manager.unregister('test-id');

      expect(manager.has('test-id')).toBe(false);
      expect(manager.getRegistrySize()).toBe(0);
    });

    it('应该支持多个 handler 注册', () => {
      const manager = SchemaEditorBridgeManager.getInstance();

      manager.register('id-1', {
        getContent: () => 'content 1',
        setContent: vi.fn(),
      });
      manager.register('id-2', {
        getContent: () => 'content 2',
        setContent: vi.fn(),
      });
      manager.register('id-3', {
        getContent: () => 'content 3',
        setContent: vi.fn(),
      });

      expect(manager.getRegistrySize()).toBe(3);
      expect(manager.has('id-1')).toBe(true);
      expect(manager.has('id-2')).toBe(true);
      expect(manager.has('id-3')).toBe(true);
    });

    it('相同 id 注册应该覆盖旧 handler', () => {
      const manager = SchemaEditorBridgeManager.getInstance();
      const handler1: BubbleHandler = {
        getContent: () => 'content 1',
        setContent: vi.fn(),
      };
      const handler2: BubbleHandler = {
        getContent: () => 'content 2',
        setContent: vi.fn(),
      };

      manager.register('test-id', handler1);
      manager.register('test-id', handler2);

      expect(manager.getRegistrySize()).toBe(1);
    });

    it('注销不存在的 id 不应该抛出错误', () => {
      const manager = SchemaEditorBridgeManager.getInstance();

      expect(() => {
        manager.unregister('non-existent-id');
      }).not.toThrow();
    });
  });

  describe('setEnabled / isEnabled', () => {
    it('初始状态应该是禁用的', () => {
      const manager = SchemaEditorBridgeManager.getInstance();

      expect(manager.isEnabled()).toBe(false);
    });

    it('应该正确设置启用状态', () => {
      const manager = SchemaEditorBridgeManager.getInstance();

      manager.setEnabled(true);
      expect(manager.isEnabled()).toBe(true);

      manager.setEnabled(false);
      expect(manager.isEnabled()).toBe(false);
    });
  });

  describe('destroy', () => {
    it('destroy 应该清理所有注册的 handler', () => {
      const manager = SchemaEditorBridgeManager.getInstance();

      manager.register('id-1', {
        getContent: () => 'content 1',
        setContent: vi.fn(),
      });
      manager.register('id-2', {
        getContent: () => 'content 2',
        setContent: vi.fn(),
      });

      SchemaEditorBridgeManager.destroy();

      const newManager = SchemaEditorBridgeManager.getInstance();
      expect(newManager.getRegistrySize()).toBe(0);
    });

    it('重复调用 destroy 不应该抛出错误', () => {
      expect(() => {
        SchemaEditorBridgeManager.destroy();
        SchemaEditorBridgeManager.destroy();
        SchemaEditorBridgeManager.destroy();
      }).not.toThrow();
    });
  });

  describe('has', () => {
    it('应该正确检查 id 是否存在', () => {
      const manager = SchemaEditorBridgeManager.getInstance();

      expect(manager.has('test-id')).toBe(false);

      manager.register('test-id', {
        getContent: () => 'content',
        setContent: vi.fn(),
      });

      expect(manager.has('test-id')).toBe(true);
      expect(manager.has('other-id')).toBe(false);
    });
  });

  describe('getRegistrySize', () => {
    it('应该正确返回注册数量', () => {
      const manager = SchemaEditorBridgeManager.getInstance();

      expect(manager.getRegistrySize()).toBe(0);

      manager.register('id-1', {
        getContent: () => '',
        setContent: vi.fn(),
      });
      expect(manager.getRegistrySize()).toBe(1);

      manager.register('id-2', {
        getContent: () => '',
        setContent: vi.fn(),
      });
      expect(manager.getRegistrySize()).toBe(2);

      manager.unregister('id-1');
      expect(manager.getRegistrySize()).toBe(1);
    });
  });

  describe('Bridge 启动/停止逻辑', () => {
    it('启用且有注册时应该启动 bridge', async () => {
      const { createSchemaEditorBridge } = await import(
        '@schema-editor/host-sdk/core'
      );
      const manager = SchemaEditorBridgeManager.getInstance();

      manager.setEnabled(true);
      manager.register('test-id', {
        getContent: () => 'content',
        setContent: vi.fn(),
      });

      expect(createSchemaEditorBridge).toHaveBeenCalled();
    });

    it('禁用时不应该启动 bridge', async () => {
      const { createSchemaEditorBridge } = await import(
        '@schema-editor/host-sdk/core'
      );
      vi.mocked(createSchemaEditorBridge).mockClear();

      const manager = SchemaEditorBridgeManager.getInstance();

      manager.setEnabled(false);
      manager.register('test-id', {
        getContent: () => 'content',
        setContent: vi.fn(),
      });

      expect(createSchemaEditorBridge).not.toHaveBeenCalled();
    });

    it('所有 handler 注销后应该停止 bridge', async () => {
      const mockCleanup = vi.fn();
      const { createSchemaEditorBridge } = await import(
        '@schema-editor/host-sdk/core'
      );
      vi.mocked(createSchemaEditorBridge).mockReturnValue(mockCleanup);

      const manager = SchemaEditorBridgeManager.getInstance();

      manager.setEnabled(true);
      manager.register('test-id', {
        getContent: () => 'content',
        setContent: vi.fn(),
      });

      /** 注销后应该调用 cleanup */
      manager.unregister('test-id');
      expect(mockCleanup).toHaveBeenCalled();
    });
  });

  describe('renderPreview 配置', () => {
    it('注册时应该能提供自定义 renderPreview', () => {
      const manager = SchemaEditorBridgeManager.getInstance();
      const customRenderPreview = vi.fn();

      manager.register('test-id', {
        getContent: () => 'content',
        setContent: vi.fn(),
        renderPreview: customRenderPreview,
      });

      expect(manager.has('test-id')).toBe(true);
    });
  });
});

