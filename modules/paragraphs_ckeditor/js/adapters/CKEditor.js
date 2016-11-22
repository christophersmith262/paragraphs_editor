/**
 * @file
 * Provides the logic for executing commands from the queue.
 */

(function ($, Drupal) {

  'use strict';

  Drupal.paragraphs_editor.adapters.ckeditor = Drupal.paragraphs_editor.EditorAdapter.extend({

    editor: null,

    init: function(editorInstance) {
      this.editor = editorInstance;
    },

    insertBufferItem: function(bufferItemModel) {
      var element = new CKEDITOR.dom.element('paragraphs-editor-paragraph');
      element.setAttribute('data-paragraph-uuid', bufferItemModel.get('id'));
      element.setAttribute('data-context-hint', bufferItemModel.get('context'));
      this.editor.insertElement(element);
      this.editor.widgets.initOn(element, 'ParagraphsCKEditorWidget');
    },

    getBufferItem: function(editBuffer, editorWidget) {
      var $widget = $(this.getWidgetEl(editorWidget));
      return editBuffer.getItem($widget.attr('data-paragraph-uuid'));
    }

    getWidget: function(bufferItemModel, editorWidget) {
      var $widget = $(this.getWidgetEl(editorWidget));
      return new Drupal.paragraphs_editor.WidgetModel({
        id: editorWidget.id,
        itemId: bufferItemModel.get('id'),
        markup: bufferItemModel.get('markup'),
        context: $widget.attr('data-context-hint'),
      });
    },

    getWidgetEl: function(editorWidget) {
      return editorWidget.element.$,
    }

    destroyWidget: function(widgetModel) {
      editor.widgets.del(editor.widgets.instances[widgetModel.get('id')]);
    },

    getRootEl: function() {
      return editor.document.$;
    },

    widgetExists: function(widgetModel) {
      return editor.widgets.instances[widgetModel.get('id')];
    }

  });

})(jQuery, Drupal);
