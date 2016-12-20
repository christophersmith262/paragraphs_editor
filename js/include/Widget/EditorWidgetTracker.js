/**
 * @file
 * Provides the logic for executing commands from the queue.
 */

(function ($, Backbone, Drupal) {

  'use strict';

  /**
   * Tracks instances of Paragraphs Editor widgets.
   */
  Drupal.paragraphs_editor.EditorWidgetTracker = function(adapter, widgetFactory, viewFactory, widgetTable) {
    this._adapter = adapter;
    this._widgetFactory = widgetFactory;
    this._viewFactory = viewFactory;
    this._widgetTable = widgetTable;
  }

  $.extend(Drupal.paragraphs_editor.EditorWidgetTracker.prototype, Backbone.Events, {

    /**
     * Makes widget manager aware of a newly inserted widget.
     */
    track: function(widget, id, $el) {
      // Create a model for representing the widget.
      var widgetModel = this._widgetFactory.create(widget, id, $el);
      var targetContext = widgetModel.embedCode.getTargetContext();
      var sourceContext = widgetModel.embedCode.getSourceContext();
      var bufferItemModel = widgetModel.embedCode.getBufferItem();

      // Setup a listener to handle when a paragraph has been duplicated and
      // the widget needs to be updated to point to the duplicate instead of
      // the originally copied paragraph.
      this.listenTo(widgetModel, 'destroy', this._removeWidget);
      this.listenTo(widgetModel, 'change:itemId', this._updateItemReference);

      // Create a widget view to render the widget within Editor.
      var widgetEditorView = this._viewFactory.create(widgetModel, $el, 'editor');

      // Add the widget to the widget to the table to keep track of it.
      this._widgetTable.add(widgetModel, widgetEditorView);

      // If the widget is not currently using the editor view mode, we treat
      // it as being in 'export' form. This means we have to create an export
      // view to load the data.
      if (this._adapter.getViewMode(widget, id, $el) != 'editor') {

        // Update the widget model based on the markup.
        this._viewFactory.createTemporary(widgetModel, $el, 'export').save();
        widgetEditorView.render();
      }

      // Mark the widget as being rendered in the editor mode.
      this._adapter.setViewMode(widget, id, $el, 'editor');

      // If there is more than one widget referencing the same buffer item we
      // need to duplicate it. Only one widget can ever reference a given
      // buffer item. Additionally, if the source context is not the same as the
      // target context we need to duplicate. A context mismatch essentially
      // means something was copied from another field instance into this field
      // instance, so all the data about it is in the original field instance.
      var matchingContexts = sourceContext.getContextString() == targetContext.getContextString();
      if (this._widgetTable.count(widgetModel) > 1 || !matchingContexts) {

        // Set temporary markup until the duplication process completes. We use
        // silent here to prevent existing inline edits from being wiped out.
        widgetModel.set({markup: "..."}, {silent: true});
        widgetEditorView.render();

        // Issue a duplication request.
        widgetModel.duplicate();
      }
    },

    cleanup: function() {
      this._adapter.cleanup();
      this.stopListening();
    },

    getTrackedTable: function() {
      return this._widgetTable;
    },

    _removeWidget: function(widgetModel) {
      if (this._adapter.widgetExists(widgetModel.get('id'))) {
        this._adapter.destroyWidget(widgetModel.get('id'));
      }

      this._widgetTable.remove(widgetModel);
    },

    /**
     * Updates the widget table when a widget's referenced item has changed.
     */
    _updateItemReference: function(widgetModel) {
      var previousItemId = widgetModel.previous('itemId');
      var updatedItemId = widgetModel.get('itemId');
      var widgetId = widgetModel.get('id');

      // Update the widget table to capture the fact that the widget is now
      // referencing a different buffer item.
      this._widgetTable.move(previousItemId, updatedItemId, widgetId);
    },
  });

})(jQuery, Backbone, Drupal);
