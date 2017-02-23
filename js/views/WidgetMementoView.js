/**
 * @file
 * A Backbone model for representing paragraphs_editor commands.
 */

(function ($, Backbone, Drupal) {

  'use strict';

  Drupal.paragraphs_editor.WidgetMementoView = Backbone.View.extend({

    initialize: function(options) {
      this.adapter = options.adapter;
      this.contextAttribute = options.elements.context_attribute;
      this.inlineEditorSelector = options.elements.inline_template.tag;
      this.attributeWhitelist = _.invert(this.model.embedCodeFactory.getAttributes());
      
    },

    template: function(fields, edits) {
      return Drupal.theme.paragraphsEditorWidgetMemento(fields, edits);
    },

    render: function() {
      var view = this;
      this.$el.html(this.template(this.model.embedCode.getBufferItem().get('fields'), this.model.get('edits')));
      _.each(this.el.attributes, function(attr) {
        if (!view.attributeWhitelist[attr.name]) {
          view.$el.removeAttr(attr.name);
        }
      });
      return this;
    },

    save: function() {
      var edits = {};
      var view = this;
      this.$el.find(this.inlineEditorSelector).each(function() {
        var contextString = $(this).attr(view.contextAttribute);
        var selector = view.inlineEditorSelector + '[' + view.contextAttribute + '="' + contextString + '"]';
        edits[contextString] = $(this).html();
      });
      this.model.set({"edits": edits}, {silent: true});
      return this;
    },

    remove: function() {
    }

  });

}(jQuery, Backbone, Drupal));
