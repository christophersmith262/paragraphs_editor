/**
 * @file
 * A Backbone model for representing paragraphs_editor commands.
 */

(function ($, Backbone, Drupal) {

  'use strict';

  /**
   * Backbone  Model for representing paragraphs_editor commands.
   *
   * @constructor
   *
   * @augments Backbone.Model
   */
  Drupal.paragraphs_editor.ContextView = Backbone.View.extnd({

    contextAttribute: 'data-context',

    initialize: function(attributes, options) {
      this.listenTo(this.model, 'change:id', this.render);
      this.render();
    }

    render: function() {
      this.$el.attr(this.contextAttribute, this.model.get('id'));
    }
  });

}(jQuery, Backbone, Drupal));
