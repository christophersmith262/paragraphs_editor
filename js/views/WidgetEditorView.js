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
      if (this.model.get('duplicating')) {
        this.$el.html(this.template('...'));
      }
      else {
        this.$el.html(this.template(this.model.get('markup')));
        this.renderAttributes();
        this.renderEdits();
      }
      return this;
    },

    renderAttributes: function() {
      var attributes = this.model.embedCode.getAttributes();
      attributes['data-paragraphs-editor-view'] = 'editor';
      for (var attributeName in attributes) {
        this.$el.attr(attributeName, attributes[attributeName]);
      }
      return this;
    },

    renderEdits: function() {
      var edits = this.model.get('edits');
      this._inlineElementVisitor(function($el, index, selector) {
        // Fetch the edit and set a data attribute to make associating edits
        // easier for whoever is going to attach the inline editor.
        var edit = edits[index] ? edits[index] : '';
        $el.attr(this.inlineEditorIdAttribute, index)
          .attr('data-paragraphs-editor-context', edit.context)
          .html(edit.value);

        // Tell the widget manager to enable inline editing for this element.
        this.adapter.attachInlineEditing(this, index, selector);
      });
      return this;
    },

    save: function() {

      if (!this.model.get('duplicating')) {
        var edits = {};
        this._inlineElementVisitor(function($el, index, selector) {
          edits[index] = {
            context: $el.attr('data-paragraphs-editor-context'),
            value: this.adapter.getInlineEdit(this, index, selector),
          };
        });

        this.model.set({"edits": edits}, {silent: true});
      }

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

    isEditorViewRendered: function() {
      return this.$el.attr('data-paragraphs-editor-view') == 'editor';
    },

    _changeHandler: function() {
      // If the widget is currently asking for a duplicate buffer item from the
      // server, or such a request just finished, we don't want to save the
      // current state of the editor since it is just displaying a 'loading'
      // message.
      if (this.model.get('duplicating') || this.model.previous('duplicating')) {
        this.render();
      }

      // If the markup changed and the widget wasn't duplicating, we have to
      // re-render everything.
      else if (this.model.hasChanged('markup')) {
        this.save().render().save();
      }

      // Otherwise we can just re-render the parts that changed.
      else {
        if (this.model.hasChanged('edits')) {
          this.renderEdits().save();
        }

        if (this.model.hasChanged('embedKey')) {
          this.renderAttributes();
        }
      }

      return this;
    },

    _inlineElementVisitor(callback) {
      var that = this;
      this.$el.find(this.inlineEditorSelector).each(function(index) {
        if ($(this).closest('paragraphs-editor-paragraph').is(that.$el)) {
          var selector = that.inlineEditorSelector + '[' + that.inlineEditorIdAttribute + '="' + index + '"]';
          callback.call(that, $(this), index, selector);
        }
      });
    }

  });

}(jQuery, Backbone, Drupal));
