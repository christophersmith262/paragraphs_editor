/**
 * @file
 * Provides the logic for executing commands from the queue.
 */

(function ($, Drupal) {

  'use strict';

  Drupal.paragraphs_editor.ParagraphsEditorField = function(contextResolver, editorContext, embedCodeFactory, prototypes) {
    this._prototypes = prototypes;
    this.contextResolver = contextResolver;
    this.embedCodeFactory = embedCodeFactory;
    this.editorContext = editorContext;
    this.detach();
  }

  $.extend(Drupal.paragraphs_editor.ParagraphsEditorField.prototype, {

    attach: function(adapter) {
      this.detach();

      // Setup a context listener for recieving buffer item arrival
      // notifications, and a context resolver for determining which context(s)
      // an element is associated with.
      var contextListener = new this._prototypes.ContextListener();
      contextListener.addContext(this.editorContext);

      // Create factories for generating models and views.
      var viewFactory = new this._prototypes.WidgetViewFactory(adapter);
      var widgetFactory = new this._prototypes.WidgetFactory(adapter, this.contextResolver, this.embedCodeFactory, this._prototypes.WidgetModel);

      // Add supported viewmodes.
      viewFactory.register('editor', this._prototypes.WidgetEditorView);
      viewFactory.register('export', this._prototypes.WidgetMementoView);

      // Create a table for storing widget instances and a tracker tracker for
      // maintaining the table based on the editor state.
      this.widgetTable = new this._prototypes.WidgetTable(adapter);
      var widgetTracker = new this._prototypes.EditorWidgetTracker(adapter, widgetFactory, viewFactory, this.widgetTable);

      // Create a mediator for controlling interactions between the widget table
      // and the edit buffer.
      var editBufferMediator = new this._prototypes.EditBufferMediator(this.embedCodeFactory, contextListener, adapter, this.contextResolver);

      // Create the public object that clients will use to interact with the
      // editor instance.
      this.widgetManager = new this._prototypes.WidgetManager(widgetTracker, viewFactory, editBufferMediator);

      return this.widgetManager;
    },

    detach: function() {
      if (this.widgetTable) {
        this.widgetTable.cleanup();
      }
      if (this.widgetManager) {
        this.widgetManager.cleanup();
      }
      this.widgetManager = null;
      this.widgetTable = null;
    },
  });

})(jQuery, Drupal);
