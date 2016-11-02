/**
 * @file
 * Provides the logic for executing commands from the queue.
 */

(function ($, Backbone, Drupal) {

  'use strict';

  /**
   * Tracks instances of Paragraphs CKEditor widgets.
   */
  Drupal.paragraphs_ckeditor.ParagraphWidgetManager = function(paragraphCommandController, paragraphPreviewFetcher, settings) {

    var paragraphPreviewWidgets = new Backbone.Collection([], {
      model: Drupal.paragraphs_ckeditor.ParagraphPreviewWidgetModel,
    });

    // Handle garbage collection for destroyed widgets.
    paragraphPreviewWidgets.on('remove', this.destroy, this);

    var views = {};
    var refs = {};
    var editor = null;

    /**
     * Initialize the widget manager for use with a soecific CKEditor instance.
     */
    this.initialize = function(editor_instance) {
      editor = editor_instance;

      function handlePreviewUpdate(model) {

        // If the new model is ready to be inserted, insert an embed code in
        // CKEditor.
        if (model.get('insert')) {
          var element = new CKEDITOR.dom.element('paragraphs-ckeditor-paragraph');
          element.setAttribute('data-paragraph-uuid', model.get('id'));
          editor.insertElement(element);
          editor.widgets.initOn(element, 'ParagraphsCKEditorWidget');
          model.set({insert: false});
        }
      };

      // Handle new paragraph arrivals.
      paragraphPreviewFetcher.on('add', handlePreviewUpdate, this);
      paragraphPreviewFetcher.on('update', handlePreviewUpdate, this);
    }

    /**
     * Makes widget manager aware of a newly inserted CKEDtior widget.
     */
    this.ingest = function(widget) {
      var $widget = $(widget.element.$);
      var preview_model = paragraphPreviewFetcher.get($widget.attr('data-paragraph-uuid'));

      var widget_model = this.update({
        id: widget.id,
        previewId: preview_model.get('id'),
        markup: preview_model.get('markup'),
      }, {merge: true});
      preview_model.on('change:markup', widget.copyMarkupFromModel, widget_model);
      widget_model.on('change:previewId', this.updatePreviewReference, this);

      var view = new Drupal.paragraphs_ckeditor.ParagraphCKEditorPreviewView({
        "model": widget_model,
        "widgetManager": this,
        "el": $widget.get(0),
      });

      views[widget_model.get('id')] = view;

      // If there is more than one reference to this paragraph in the document
      // we have to request a clone from the server.
      if ($().find().length > 1) {
      }

      return view.render();
    };

    /**
     * Triggers the widget insertion flow.
     */
    this.insert = function() {
      paragraphCommandController.insert();
    }

    this.update = function(widget) {
      return paragraphPreviewWidgets.add(widget, {merge: true});
    }

    /**
     * Triggers the widget edit flow.
     */
    this.edit = function(model) {
      paragraphCommandController.edit(model.get('previewId'));
    };

    /**
     * Destroys the model and view associated with a CKEditor widget.
     */
    this.destroy = function(model) {
      if (!model) {
        return;
      }

      var model_id = model.get('id');
      if (views[model_id]) {
        views[model_id].close();
        delete views[model_id];
      }

      paragraphPreviewWidgets.remove(model_id, {silent: true});
    };

    this.updatePreviewReference = function(model) {
      // Remove the widget model as a listener from the old paragraph preview.
      var previous = this.paragraphPreviewFetcher.get(model.previous('previewId'));
      previous.off('change:markup', model.copyMarkupFromModel, model);

      // Add the widget modal as a listener to the new paragraph preview.
      var updated = this.paragraphPreviewFetcher.get(model.get('previewId'));
      model.set({markup: updated.get('markup')});
      updated.on('change:markup', model.copyMarkupFromModel, model);

      // Update the widget embed code data-paragraph-uuid with the new id.
      $(editor.document.$).find().attr('data-paragraph-uuid', updated.get('id'));
    }

    this.getSettings = function() {
      return settings;
    }

    this.getSetting = function(key) {
      return settings[key];
    }

  };

})(jQuery, Backbone, Drupal);
