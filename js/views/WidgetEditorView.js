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
  Drupal.paragraphs_editor.WidgetEditorView = Backbone.View.extend({

    inlineEditorSelector: '.paragraphs-editor-nested-editor',
    inlineEditorIdAttribute: 'data-editor-index',

    initialize: function(options) {
      this.adapter = options.adapter;
      this.listenTo(this.model, 'change', this._changeHandler);
    },

    events: {
      'click .paragraphs-editor-command--edit': 'edit',
      'click .paragraphs-editor-command--remove': 'remove',
    },

    template: function(markup) {
      return Drupal.theme.paragraphsEditorWidget(markup);
    },

    render: function() {
      this.$el.html(this.template(this.model.get('markup')));
      this.renderAttributes();
      this.renderEdits();
      return this;
    },

    renderAttributes: function() {
      var attributes = this.model.embedCode.getAttributes();
      for (var attributeName in attributes) {
        this.$el.attr(attributeName, attributes[attributeName]);
      }
      return this;
    },

    renderEdits: function() {
      var that = this;
      var edits = this.model.get('edits');
      this.$el.find(that.inlineEditorSelector).each(function(index) {
        // Fetch the edit and set a data attribute to make associating edits
        // easier for whoever is going to attach the inline editor.
        var edit = edits[index] ? edits[index] : '';
        $(this).attr(that.inlineEditorIdAttribute, index).html(edit);

        // Tell the widget manager to enable inline editing for this element.
        var selector = that.inlineEditorSelector + '[' + that.inlineEditorIdAttribute + '="' + index + '"]';
        that.adapter.attachInlineEditing(that, index, selector);
      });
      return this;
    },

    save: function() {
      var edits = {};
      this.$el.find(this.inlineEditorSelector).each(function(index) {
        edits[index] = {
          context: $(this).attr('data-paragraphs-editor-context'),
          value: $(this).html(),
        };
      });

      this.model.set({"edits": edits}, {silent: true});

      return this;
    },

    edit: function() {
      this.model.edit();
    },

    remove: function() {
      this.stopListening();
      if (this.model) {
        var model = this.model;
        this.model = null;
        model.destroy();
      }
      return this;
    },

    _changeHandler: function() {
      if (this.model.hasChanged('markup')) {
        this.save().render().save();
      }
      else {
        if (this.model.hasChanged('edits')) {
          this.renderEdits().save();
        }

        if (this.model.hasChanged('embedKey')) {
          this.renderAttributes();
        }
      }

      return this;
    }

  });

}(jQuery, Backbone, Drupal));
