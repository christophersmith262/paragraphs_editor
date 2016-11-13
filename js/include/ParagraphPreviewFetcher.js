/**
 * @file
 * Provides the logic for executing commands from the queue.
 */

(function (Backbone, Drupal) {

  'use strict';

  /**
   * Handles fetching and caching of rendered paragraphs.
   */
  Drupal.paragraphs_ckeditor.ParagraphPreviewFetcher = function(paragraphCommandController) {

    var paragraphPreviewCache = new Backbone.Collection([], {
      model: Drupal.paragraphs_ckeditor.ParagraphPreviewModel,
    });

    this.get = function(uuid) {
      var preview = paragraphPreviewCache.get(uuid);
      if (!preview) {
        preview = paragraphPreviewCache.add({id: uuid}, {merge: true});
        paragraphCommandController.render(uuid);
      }
      return preview;
    }

    this.update = function(model) {
      return paragraphPreviewCache.add(model, {merge: true});
    }

    this.on = function(evt, callback, context) {
      paragraphPreviewCache.on(evt, callback, context);
    }
  };

})(Backbone, Drupal);
