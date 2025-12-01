import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  useSchemaEditorBridge,
  UseSchemaEditorBridgeConfig,
} from '../../../src/Bubble/schema-editor/useSchemaEditorBridge';
import { SchemaEditorBridgeManager } from '../../../src/Bubble/schema-editor/SchemaEditorBridgeManager';

/** Mock @schema-editor/host-sdk */
vi.mock('@schema-editor/host-sdk/core', () => ({
  createSchemaEditorBridge: vi.fn(() => vi.fn()),
}));

/** Mock react-use */
vi.mock('react-use', () => ({
  useLatest: <T,>(value: T) => ({ current: value }),
}));

describe('useSchemaEditorBridge', () => {
  beforeEach(() => {
    SchemaEditorBridgeManager.destroy();
  });

  afterEach(() => {
    SchemaEditorBridgeManager.destroy();
    vi.clearAllMocks();
  });

  describe('初始化', () => {
    it('应该返回初始内容', () => {
      const { result } = renderHook(() =>
        useSchemaEditorBridge('test-id', 'initial content'),
      );

      expect(result.current.content).toBe('initial content');
    });

    it('应该返回 setContent 函数', () => {
      const { result } = renderHook(() =>
        useSchemaEditorBridge('test-id', 'initial content'),
      );

      expect(typeof result.current.setContent).toBe('function');
    });

    it('空初始内容应该正常工作', () => {
      const { result } = renderHook(() => useSchemaEditorBridge('test-id', ''));

      expect(result.current.content).toBe('');
    });
  });

  describe('setContent', () => {
    it('应该更新内容', () => {
      const { result } = renderHook(() =>
        useSchemaEditorBridge('test-id', 'initial'),
      );

      act(() => {
        result.current.setContent('updated');
      });

      expect(result.current.content).toBe('updated');
    });

    it('应该触发 onContentChange 回调', () => {
      const onContentChange = vi.fn();
      const config: UseSchemaEditorBridgeConfig = { onContentChange };

      const { result } = renderHook(() =>
        useSchemaEditorBridge('test-id', 'initial', config),
      );

      act(() => {
        result.current.setContent('updated');
      });

      expect(onContentChange).toHaveBeenCalledWith('updated');
    });

    it('没有 onContentChange 时不应该抛出错误', () => {
      const { result } = renderHook(() =>
        useSchemaEditorBridge('test-id', 'initial'),
      );

      expect(() => {
        act(() => {
          result.current.setContent('updated');
        });
      }).not.toThrow();
    });
  });

  describe('enabled 配置', () => {
    it('默认应该启用（enabled = true）', () => {
      renderHook(() => useSchemaEditorBridge('test-id', 'content'));

      const manager = SchemaEditorBridgeManager.getInstance();
      expect(manager.has('test-id')).toBe(true);
    });

    it('enabled = false 时不应该注册到管理器', () => {
      renderHook(() =>
        useSchemaEditorBridge('test-id', 'content', { enabled: false }),
      );

      const manager = SchemaEditorBridgeManager.getInstance();
      expect(manager.has('test-id')).toBe(false);
    });

    it('enabled 从 true 变为 false 时应该注销', () => {
      const { rerender } = renderHook(
        ({ enabled }: { enabled: boolean }) =>
          useSchemaEditorBridge('test-id', 'content', { enabled }),
        { initialProps: { enabled: true } },
      );

      const manager = SchemaEditorBridgeManager.getInstance();
      expect(manager.has('test-id')).toBe(true);

      rerender({ enabled: false });

      expect(manager.has('test-id')).toBe(false);
    });

    it('enabled 从 false 变为 true 时应该注册', () => {
      const { rerender } = renderHook(
        ({ enabled }: { enabled: boolean }) =>
          useSchemaEditorBridge('test-id', 'content', { enabled }),
        { initialProps: { enabled: false } },
      );

      const manager = SchemaEditorBridgeManager.getInstance();
      expect(manager.has('test-id')).toBe(false);

      rerender({ enabled: true });

      expect(manager.has('test-id')).toBe(true);
    });
  });

  describe('id 处理', () => {
    it('id 为 undefined 时不应该注册', () => {
      renderHook(() => useSchemaEditorBridge(undefined, 'content'));

      const manager = SchemaEditorBridgeManager.getInstance();
      expect(manager.getRegistrySize()).toBe(0);
    });

    it('id 变化时应该重新注册', () => {
      const { rerender } = renderHook(
        ({ id }: { id: string }) => useSchemaEditorBridge(id, 'content'),
        { initialProps: { id: 'id-1' } },
      );

      const manager = SchemaEditorBridgeManager.getInstance();
      expect(manager.has('id-1')).toBe(true);

      rerender({ id: 'id-2' });

      /** 旧 id 应该被注销，新 id 应该被注册 */
      expect(manager.has('id-1')).toBe(false);
      expect(manager.has('id-2')).toBe(true);
    });
  });

  describe('initialContent 变化', () => {
    it('initialContent 变化时应该更新内部状态', () => {
      const { result, rerender } = renderHook(
        ({ initialContent }: { initialContent: string }) =>
          useSchemaEditorBridge('test-id', initialContent),
        { initialProps: { initialContent: 'initial' } },
      );

      expect(result.current.content).toBe('initial');

      rerender({ initialContent: 'updated from prop' });

      expect(result.current.content).toBe('updated from prop');
    });
  });

  describe('组件卸载', () => {
    it('卸载时应该注销 handler', () => {
      const { unmount } = renderHook(() =>
        useSchemaEditorBridge('test-id', 'content'),
      );

      const manager = SchemaEditorBridgeManager.getInstance();
      expect(manager.has('test-id')).toBe(true);

      unmount();

      expect(manager.has('test-id')).toBe(false);
    });
  });

  describe('多个 Hook 实例', () => {
    it('多个实例应该各自独立注册', () => {
      renderHook(() => useSchemaEditorBridge('id-1', 'content 1'));
      renderHook(() => useSchemaEditorBridge('id-2', 'content 2'));
      renderHook(() => useSchemaEditorBridge('id-3', 'content 3'));

      const manager = SchemaEditorBridgeManager.getInstance();
      expect(manager.getRegistrySize()).toBe(3);
      expect(manager.has('id-1')).toBe(true);
      expect(manager.has('id-2')).toBe(true);
      expect(manager.has('id-3')).toBe(true);
    });

    it('部分实例卸载不应该影响其他实例', () => {
      const hook1 = renderHook(() => useSchemaEditorBridge('id-1', 'content 1'));
      const hook2 = renderHook(() => useSchemaEditorBridge('id-2', 'content 2'));

      const manager = SchemaEditorBridgeManager.getInstance();
      expect(manager.getRegistrySize()).toBe(2);

      hook1.unmount();

      expect(manager.has('id-1')).toBe(false);
      expect(manager.has('id-2')).toBe(true);
      expect(manager.getRegistrySize()).toBe(1);
    });
  });

  describe('renderPreview 配置', () => {
    it('应该将 renderPreview 传递给管理器', () => {
      const customRenderPreview = vi.fn();

      renderHook(() =>
        useSchemaEditorBridge('test-id', 'content', {
          renderPreview: customRenderPreview,
        }),
      );

      const manager = SchemaEditorBridgeManager.getInstance();
      expect(manager.has('test-id')).toBe(true);
    });
  });

  describe('边界情况', () => {
    it('config 为 undefined 时应该使用默认值', () => {
      const { result } = renderHook(() =>
        useSchemaEditorBridge('test-id', 'content', undefined),
      );

      expect(result.current.content).toBe('content');

      const manager = SchemaEditorBridgeManager.getInstance();
      expect(manager.has('test-id')).toBe(true);
    });

    it('空对象 config 应该使用默认值', () => {
      const { result } = renderHook(() =>
        useSchemaEditorBridge('test-id', 'content', {}),
      );

      expect(result.current.content).toBe('content');

      const manager = SchemaEditorBridgeManager.getInstance();
      expect(manager.has('test-id')).toBe(true);
    });

    it('特殊字符 id 应该正常工作', () => {
      const specialIds = [
        'id-with-dash',
        'id_with_underscore',
        'id.with.dot',
        'id:with:colon',
        '中文id',
        '123-numeric-start',
      ];

      specialIds.forEach((id) => {
        const { unmount } = renderHook(() =>
          useSchemaEditorBridge(id, 'content'),
        );

        const manager = SchemaEditorBridgeManager.getInstance();
        expect(manager.has(id)).toBe(true);

        unmount();
      });
    });
  });
});

