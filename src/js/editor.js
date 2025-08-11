/**
 * WordPress 编辑器 JavaScript 测试代码
 * 为方圆主题添加简单的编辑器功能
 */

// 当 DOM 加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    console.log('方圆主题编辑器脚本已加载');
    
    // 为编辑器添加简单的提示功能
    if (document.querySelector('.editor-styles-wrapper')) {
        console.log('WordPress 编辑器检测成功');
        
        // 添加编辑器工具栏增强
        const editorToolbar = document.querySelector('.edit-post-header-toolbar');
        if (editorToolbar) {
            console.log('编辑器工具栏已找到');
        }
    }
});

// 测试函数：显示主题信息
window.fangyuanThemeInfo = function() {
    alert('方圆主题 - WordPress 2025 开发环境');
};
