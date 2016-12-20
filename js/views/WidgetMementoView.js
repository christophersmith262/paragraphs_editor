/**
 * @file
 * A Backbone model for representing paragraphs_editor commands.
 */

(function ($, Backbone, Drupal) {

  'use strict';

  Drupal.paragraphs_editor.WidgetMementoView = Backbone.View.extend({

    template: function(edits) {
      return Drupal.theme.paragraphsEditorWidgetMemento(edits);
    },

    render: function() {
      this.$el.html(this.template(this.model.get('edits')));
      return this;
    },

    save: function() {
      var edits = {};
      this.$el.find('paragraphs-editor-nested-editor').each(function(index) {
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
