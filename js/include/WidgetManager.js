/**
 * @file
 * Provides the logic for executing commands from the queue.
 */

(function ($, Drupal) {

  'use strict';

  /**
   * Tracks instances of Paragraphs Editor widgets.
   */
  Drupal.paragraphs_editor.WidgetManager = function(commandEmitter, editBuffer, settings) {

    var adapter = null;
    var widgets = null;

    /**
     * Initialize the widget manager for use with a soecific Editor instance.
     */
    this.initialize = function(adapterInstance) {
      adapter = adapterInstance;
      widgets = new Drupal.paragraphs_editor.WidgetTable(editBuffer, adapter);

      function handleBufferItemUpdate(bufferItemModel) {
        // If the new model is ready to be inserted, insert an embed code in
        // Editor and mark the model as inserted.
        if (bufferItemModel.get('insert')) {
          adapter.insertBufferItem(bufferItemModel);
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
      var $widget = $(adapter.getWidgetEl(widget));
      var bufferItemModel = adapter.getBufferItem(editBuffer, widget);
      var widgetModel = adapter.getWidget(bufferItemModel, widget);

      // Set up the widget model to listen to data change events on the buffer
      // item it references.
      bufferItemModel.on('change:markup', widgetModel.onItemUpdate, widgetModel);
      bufferItemModel.on('change:context', widgetModel.onItemUpdate, widgetModel);

      // Setup a listener to handle when a paragraph has been duplicated and
      // the widget needs to be updated to point to the duplicate instead of
      // the originally copied paragraph.
      widgetModel.on('change:itemId', updateItemReference, this);

      // Create a widget view to render the widget within Editor.
      var widgetView = new Drupal.paragraphs_editor.WidgetView({
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

      // Render the Editor widget view.
      widgets.render(widgetModel);

      return widgetModel;
    };

    /**
     * Triggers the widget insertion flow.
     */
    this.insert = function(bundle_name) {
      commandEmitter.insert(bundle_name);
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
     * Destroys the model and view associated with a Editor widget.
     */
    this.destroy = function(widgetModel, offline) {
      var widgetId = widgetModel.get('id');
      if (!offline && adapter.widgetExists(widgetModel)) {
        adapter.destroyWidget(widgetModel);
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
