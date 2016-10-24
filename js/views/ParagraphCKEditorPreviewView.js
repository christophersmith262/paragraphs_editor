/**
 * @file
 * A Backbone model for representing paragraphs_ckeditor commands.
 */

(function ($, Backbone, Drupal) {

  'use strict';

  /**
   * Backbone  Model for representing paragraphs_ckeditor commands.
   *
   * @constructor
   *
   * @augments Backbone.Model
   */
  Drupal.paragraphs_ckeditor.ParagraphCKEditorPreviewView = Backbone.View.extend({

    initialize: function(options) {
      this.$paragraphsCKEditor = options.$paragraphsCKEditor;
    },

    template: function(markup) {
      return Drupal.theme.paragraphsCKEditorPreview(markup);
    },

    render: function() {
      $(this.el).html(this.template(this.model.get('markup')));
      return this;
    },

  });

}(jQuery, Backbone, Drupal));
