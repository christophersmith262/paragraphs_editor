/**
 * @file
 * Provides the logic for executing commands from the queue.
 */

(function (Backbone, Drupal) {

  'use strict';

  /**
   * Stores CKEditor widget state.
   */
  Drupal.paragraphs_ckeditor.ParagraphWidgetManager = function(paragraphCommandController, paragraphPreviewFetcher) {

    var paragraphPreviewWidgets = new Backbone.Collection([], {
      model: Drupal.paragraphs_ckeditor.ParagraphPreviewWidgetModel,
    });
    paragraphPreviewWidgets.on('remove', this.destroy, this);

    var views = {};

    this.ingest = function(widget_id, paragraph_uuid, el) {
      var preview = paragraphPreviewFetcher.get(paragraph_uuid);

      var widget = paragraphPreviewWidgets.add({
        id: widget_id,
        previewId: preview.get('id'),
        markup: preview.get('markup'),
      }, {merge: true});
      preview.on('change:markup', widget.copyMarkupFromModel, widget);

      var view = new Drupal.paragraphs_ckeditor.ParagraphCKEditorPreviewView({
        "model": widget,
        "widgetManager": this,
        "el": el,
      });

      views[widget.get('id')] = view;

      return view.render();
    };

    this.insert = function() {
      paragraphCommandController.insert();
    }

    this.edit = function(model) {
      paragraphCommandController.edit(model.get('previewId'));
    };

    this.destroy = function(model) {
      if (!model) {
        return;
      }

      var model_id = model.get('id');
      if (views[model_id]) {
        views[model_id].close();
        delete views[model_id];
      }

      paragraphPreviewWidgets.remove(model_id);
    };

  };

})(Backbone, Drupal);
