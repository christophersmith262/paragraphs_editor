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
          element.setAttribute('data-context-hint', model.get('context'));
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
      var preview_id = preview_model.get('id');
      var widget_id = widget.id;

      var widget_model = this.update({
        id: widget_id,
        previewId: preview_id,
        markup: preview_model.get('markup'),
      }, {merge: true});
      preview_model.on('change:markup', widget_model.onPreviewUpdate, widget_model);
      preview_model.on('change:context', widget_model.onPreviewUpdate, widget_model);
      widget_model.on('change:previewId', this.updatePreviewReference, this);

      var view = new Drupal.paragraphs_ckeditor.ParagraphCKEditorPreviewView({
        "model": widget_model,
        "widgetManager": this,
        "el": $widget.get(0),
      });

      // If there is more than one reference to this paragraph in the document
      // we have to request a duplicate from the server. We also take this
      // opportunity to clean up dangling views.
      if (views[preview_id]) {
        for (var i in views[preview_id]) {
          if (editor.document.$.contains(views[preview_id][i].el)) {
            this.duplicate(widget_model);
          }
          else {
            this.destroy(views[preview_id][i].model);
          }
        }
      }
      else {
        views[preview_id] = {};
      }

      views[preview_id][widget_id] = view;
      view.render();

      return widget_model;
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

    this.duplicate = function(model) {
      var preview_model = paragraphPreviewFetcher.get(model.get('previewId'));
      paragraphCommandController.duplicate(preview_model.get('id'), preview_model.get('context'), model.get('id'));
    }

    /**
     * Destroys the model and view associated with a CKEditor widget.
     */
    this.destroy = function(widget_model) {
      if (!widget_model) {
        return;
      }

      var preview_id = widget_model.get('previewId');
      var widget_id = widget_model.get('id');
      if (views[preview_id]) {
        // Delete the view for the model being destroyed.
        if (views[preview_id][widget_id]) {
          views[preview_id][widget_id].close();
          delete views[preview_id][widget_id];
        }

        // Perform garbage collection on dangling views that are no longer in
        // the DOM.
        for (var i in views[preview_id]) {
          if (!editor.document.$.contains(views[preview_id][i].el)) {
            views[preview_id][i].close();
            delete views[preview_id][i];
          }
        }

        // If there are no widgets currently referencing this paragraph preview,
        // free it from browser side storage. We can always repopulate it with
        // an ajax call.
        if (views[preview_id].length == 0) {
          //paragraphPreviewFetcher.free(preview_id);
          delete views[preview_id];
        }
      }

      paragraphPreviewWidgets.remove(widget_id, {silent: true});
    };

    this.updatePreviewReference = function(model) {
      var previous_preview_id = model.previous('previewId');
      var updated_preview_id = model.get('previewId');
      var widget_id = model.get('id');

      // Remove the widget model as a listener from the old paragraph preview.
      var previous = paragraphPreviewFetcher.get(previous_preview_id);
      previous.off('change:markup', model.onPreviewUpdate, model);
      previous.off('change:context', model.onPreviewUpdate, model);

      // Add the widget modal as a listener to the new paragraph preview.
      var updated = paragraphPreviewFetcher.get(model.get('previewId'));
      model.set({markup: updated.get('markup')});
      updated.on('change:markup', model.onPreviewUpdate, model);
      updated.on('change:context', model.onPreviewUpdate, model);

      // Update the view table to move the view mapping from the old preview id
      // to the new one.
      var view = views[previous_preview_id][widget_id];
      if (!views[updated_preview_id]) {
        views[updated_preview_id] = {};
      }
      views[updated_preview_id][widget_id] = view;
      delete views[previous_preview_id][widget_id];
    }

    this.getSettings = function() {
      return settings;
    }

    this.getSetting = function(key) {
      return settings[key];
    }

  };

})(jQuery, Backbone, Drupal);
