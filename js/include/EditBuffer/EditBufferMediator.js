/**
 * @file
 * Provides the logic for executing commands from the queue.
 */

(function ($, Backbone, Drupal) {

  'use strict';

  Drupal.paragraphs_editor.EditBufferMediator = function(embedCodeFactory, contextListener, adapter, contextResolver) {
    this._embedCodeFactory = embedCodeFactory;
    this._contextResolver = contextResolver;
    this._contextListener = contextListener;
    this._adapter = adapter;
    this.listenTo(this._contextListener, 'insertItem', this._insertBufferItem);
  }

  $.extend(Drupal.paragraphs_editor.EditBufferMediator.prototype, Backbone.Events, {

    /**
     * Triggers the widget insertion flow.
     */
    requestBufferItem: function(bundleName, $el) {
      var targetContext = this._contextResolver.resolveTargetContext($el);
      this._contextListener.addContext(targetContext);
      this._embedCodeFactory.getCommandEmitter().insert(targetContext.get('id'), bundleName);
        
    },

    cleanup: function() {
      this.stopListening();
    },

    _insertBufferItem: function(bufferItemModel) {
      // If the new model is ready to be inserted, insert an embed code in
      // Editor and mark the model as inserted.
      var embedCode = this._embedCodeFactory.create(bufferItemModel);
      embedCode.setViewMode('editor');
      this._adapter.insertEmbedCode(embedCode);
    }

  });

})(jQuery, Backbone, Drupal);
