/**
 * @file
 * Provides the logic for executing commands from the queue.
 */

(function (Backbone, Drupal) {

  'use strict';

  Drupal.paragraphs_ckeditor.CommandQueueProcessor = function($emitter, command_queue) {

    /**
     * Internal callback for triggering the command to be sent.
     *
     * @param {Drupal.paragraphs_ckeditor.CommandModel} model
     *   The command to be executed.
     */
    this.executeCommand = function(model) {
      $emitter.attr('value', JSON.stringify({
        id: model.get('id'),
        data: model.get('data'),
      }))
      .trigger('paragraphs-ckeditor-emit-command');
    },

    /**
     * Internal callback for triggering the command to be sent.
     *
     * @param {Drupal.paragraphs_ckeditor.CommandModel} model
     *   The command to be executed.
     */
    this.processResponse = function(model) {
      model.get('success').call(model, model.get('response'));
      command_queue.remove(model);
    }

    command_queue.on('add', this.executeCommand);
    command_queue.on('update', this.executeCommand);
    command_queue.on('change:response', this.processResponse);
  }

}(Backbone, Drupal));
