/**
 * @file
 * Provides the logic for executing commands from the queue.
 */

(function ($, Drupal) {

  'use strict';

  /**
   * Tracks instances of Paragraphs CKEditor widgets.
   */
  Drupal.paragraphs_ckeditor.WidgetManager = function(commandEmitter, editBuffer, settings) {

    var editor = null;
    var widgets = null;

    /**
     * Initialize the widget manager for use with a soecific CKEditor instance.
     */
    this.initialize = function(editor_instance) {
      editor = editor_instance;
      widgets = new Drupal.paragraphs_ckeditor.WidgetTable(editBuffer, editor);

      function handleBufferItemUpdate(bufferItemModel) {
        // If the new model is ready to be inserted, insert an embed code in
        // CKEditor and mark the model as inserted.
        if (bufferItemModel.get('insert')) {
          var element = new CKEDITOR.dom.element('paragraphs-ckeditor-paragraph');
          element.setAttribute('data-paragraph-uuid', bufferItemModel.get('id'));
          element.setAttribute('data-context-hint', bufferItemModel.get('context'));
          editor.insertElement(element);
          editor.widgets.initOn(element, 'ParagraphsCKEditorWidget');
          bufferItemModel.set({insert: false});
        }
      };

      // Handle new paragraph arrivals.
      editBuffer.on('add', handleBufferItemUpdate, this);
      editBuffer.on('update', handleBufferItemUpdate, this);
    }

    /**
     * Makes widget manager aware of a newly inserted CKEDtior widget.
     */
    this.ingest = function(widget) {
      var $widget = $(widget.element.$);
      var bufferItemModel = editBuffer.getItem($widget.attr('data-paragraph-uuid'));
      var contextString = $widget.attr('data-context-hint');
      var itemId = bufferItemModel.get('id');
      var widgetId = widget.id;

      // Create a model to represent the widget.
      var widgetModel = new Drupal.paragraphs_ckeditor.WidgetModel({
        id: widgetId,
        itemId: itemId,
        markup: bufferItemModel.get('markup'),
        context: contextString,
      });

      // Set up the widget model to listen to data change events on the buffer
      // item it references.
      bufferItemModel.on('change:markup', widgetModel.onItemUpdate, widgetModel);
      bufferItemModel.on('change:context', widgetModel.onItemUpdate, widgetModel);

      // Setup a listener to handle when a paragraph has been duplicated and
      // the widget needs to be updated to point to the duplicate instead of
      // the originally copied paragraph.
      widgetModel.on('change:itemId', updateItemReference, this);

      // Create a widget view to render the widget within CKEditor.
      var widgetView = new Drupal.paragraphs_ckeditor.WidgetView({
        "model": widgetModel,
        "widgetManager": this,
        "el": $widget.get(0),
      });

      // Add the widget to the widget to the table to keep track of it.
      widgets.add(widgetModel, widgetView);

      // If there is more than one widget referencing the same buffer item we
      // need to duplicate it. Only one widget can every reference a given
      // buffer item.
      if (widgets.count(widgetModel) > 1) {
        widgetModel.set({markup: "..."});
        this.duplicate(widgetModel);
      }

      // Render the CKEditor widget view.
      widgets.render(widgetModel);

      return widgetModel;
    };

    /**
     * Triggers the widget insertion flow.
     */
    this.insert = function() {
      commandEmitter.insert();
    }

    this.update = function(widgetModel) {
      return widgets.update(widgetModel);
    }

    /**
     * Triggers the widget edit flow.
     */
    this.edit = function(widgetModel) {
      commandEmitter.edit(widgetModel.get('itemId'));
    };

    this.duplicate = function(widgetModel) {
      commandEmitter.duplicate(widgetModel.get('itemId'), widgetModel.get('context'), widgetModel.get('id'));
    }

    /**
     * Destroys the model and view associated with a CKEditor widget.
     */
    this.destroy = function(widgetModel, offline) {
      var widgetId = widgetModel.get('id');
      if (!offline && editor.widgets.instances[widgetId]) {
        var widget = editor.widgets.instances[widgetId];
        editor.widgets.del(widget);
      }
      else {
        widgets.remove(widgetModel);
      }
    };

    this.getSettings = function() {
      return settings;
    }

    this.getSetting = function(key) {
      return settings[key];
    }

    function updateItemReference(widgetModel) {
      var previousItemId = widgetModel.previous('itemId');
      var updatedItemId = widgetModel.get('itemId');
      var widgetId = widgetModel.get('id');

      // Remove the widget model as a listener from the old buffer item.
      var previous = editBuffer.getItem(previousItemId);
      previous.off('change:markup', widgetModel.onItemUpdate, widgetModel);
      previous.off('change:context', widgetModel.onItemUpdate, widgetModel);

      // Add the widget modal as a listener to the new buffer item.
      var updated = editBuffer.getItem(updatedItemId);
      updated.on('change:markup', widgetModel.onItemUpdate, widgetModel);
      updated.on('change:context', widgetModel.onItemUpdate, widgetModel);

      // Update the widget table to capture the fact that the widget is now
      // referencing a different buffer item.
      widgets.move(previousItemId, updatedItemId, widgetId);

      // Re-render the widget.
      widgetModel.set({markup: updated.get('markup')});
      widgets.render(widgetModel);
    }
  };

})(jQuery, Drupal);
