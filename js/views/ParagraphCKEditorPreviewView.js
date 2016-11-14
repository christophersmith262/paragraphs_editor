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
      this.widgetManager = options.widgetManager;
      this.$widgetWrapper = $(this.el).closest('.cke_widget_wrapper');
      this.model.on('change:markup', this.render, this);
      this.model.on('change:previewId', this.render, this);
    },

    template: function(markup) {
      return Drupal.theme.paragraphsCKEditorPreview(markup);
    },

    render: function() {
      $(this.el).html(this.template(this.model.get('markup')))
        .attr('data-paragraph-uuid', this.model.get('previewId'))
        .attr('data-context-hint', this.model.get('context'));

      var that = this;
      $(this.el).find('.paragraphs-ckeditor-command--edit').click(function() {
        that.widgetManager.edit(that.model);
      });

      $(this.el).find('.paragraphs-ckeditor-command--remove').click(function() {
        that.widgetManager.destroy(that.model);
      });

      return this;
    },

    renderSource() {
      $(this.el).html('')
        .attr('data-paragraph-uuid', this.model.get('previewId'))
        .attr('data-context-hint', this.model.get('context'));

      return this;
    }

    close: function() {
      this.$widgetWrapper.remove();
    },

  });

}(jQuery, Backbone, Drupal));
