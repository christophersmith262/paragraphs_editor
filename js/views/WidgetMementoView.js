/**
 * @file
 * A Backbone model for representing paragraphs_editor commands.
 */

(function ($, Backbone, Drupal) {

  'use strict';

  Drupal.paragraphs_editor.WidgetMementoView = Backbone.View.extend({

    initialize: function(options) {
      this.adapter = options.adapter;
    },

    template: function(edits) {
      return Drupal.theme.paragraphsEditorWidgetMemento(edits);
    },

    render: function() {
      this.$el.html(this.template(this.model.get('edits')));
      this.$el.removeAttr('data-paragraphs-editor-view');
      return this;
    },

    save: function() {
      var edits = {};
      var that = this;
      this.$el.find('paragraphs-editor-nested-editor').each(function(index) {
        var contextString = $(this).attr('data-paragraphs-editor-context');
        var selector = 'paragraphs-editor-nested-editor[data-paragraphs-editor-context="' + contextString + '"]';
        edits[index] = {
          context: $(this).attr('data-paragraphs-editor-context'),
          value: $(this).html(),
        };
      });
      this.model.set({"edits": edits}, {silent: true});

      return this;
    },

    remove: function() {
    }

  });

}(jQuery, Backbone, Drupal));
