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

    commandSelector: '.paragraphs-editor-command',

    initialize: function(options) {
      this.adapter = options.adapter;
      this.contextAttribute = options.elements.context_attribute;
      this.inlineEditorSelector = '.paragraphs-editor-' + options.elements.inline_template.tag;
      this.listenTo(this.model, 'change', this._changeHandler);
    },

    template: function(markup) {
      return Drupal.theme.paragraphsEditorWidget(markup);
    },

    render: function() {
      if (this.model.get('duplicating')) {
        this.$el.html(this.template('...'));
      }
      else {
        var view = this;
        this.$el.html(this.template(this.model.get('markup')));
        this.$el.find(this.commandSelector + '--edit').on('click', function() {
          view.save().edit();
        });
        this.$el.find(this.commandSelector + '--remove').on('click', function() {
          view.remove();
        });
        this.renderAttributes();
        this.renderEdits();
      }
      return this;
    },

    renderAttributes: function() {
      var attributes = this.model.get('attributes');
      attributes[this.model.embedCode.viewModeAttribute] = 'editor';
      for (var attributeName in attributes) {
        this.$el.attr(attributeName, attributes[attributeName]);
      }
      return this;
    },

    renderEdits: function() {
      var edits = this.model.get('edits');
      this._inlineElementVisitor(function($el, contextString, selector) {
        // Fetch the edit and set a data attribute to make associating edits
        // easier for whoever is going to attach the inline editor.
        $el.html(edits[contextString] ? edits[contextString] : '');

        // Tell the widget manager to enable inline editing for this element.
        this.adapter.attachInlineEditing(this, contextString, selector);
      });
      return this;
    },

    save: function() {

      if (!this.model.get('duplicating')) {
        var edits = {};
        this._inlineElementVisitor(function($el, contextString, selector) {
          edits[contextString] = this.adapter.getInlineEdit(this, contextString, selector);
        });
        this.model.set({"edits": edits}, {silent: true});
      }

      return this;
    },

    rebase: function() {
      var oldEdits = _.pairs(this.model.get('edits'));
      var edits = {}
      this._inlineElementVisitor(function($el, contextString, selector) {
        var next = oldEdits.shift();
        edits[contextString] = next ? next[1] : '';
      });
      this.model.set({"edits": edits});

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

    stopListening: function() {
      this.$el.find(this.commandSelector).off();
      return Backbone.View.prototype.stopListening.call(this);
    },

    isEditorViewRendered: function() {
      return this.$el.attr(this.model.embedCode.viewModeAttribute) == 'editor';
    },

    _changeHandler: function() {
      // If the widget is currently asking for a duplicate buffer item from the
      // server, or such a request just finished, we don't want to save the
      // current state of the editor since it is just displaying a 'loading'
      // message.
      if (this.model.previous('duplicating')) {
        this.render().rebase();
      }

      // If the markup changed and the widget wasn't duplicating, we have to
      // re-render everything.
      else if (this.model.get('duplicating') || this.model.hasChanged('markup')) {
        this.render();
      }

      // Otherwise we can just re-render the parts that changed.
      else {
        if (this.model.hasChanged('edits')) {
          this.renderEdits();
        }

        if (this.model.hasChanged('attributes')) {
          this.renderAttributes();
        }
      }

      return this;
    },

    _inlineElementVisitor(callback) {
      var view = this;
      this.$el.find(this.inlineEditorSelector).each(function() {
        if ($(this).closest(view.model.embedCodeFactory.getTag()).is(view.$el)) {
          var contextString = $(this).attr(view.contextAttribute);
          var selector = view.inlineEditorSelector + '[' + view.contextAttribute + '="' + contextString + '"]';
          callback.call(view, $(this), contextString, selector);
        }
      });
    }

  });

}(jQuery, Backbone, Drupal));
