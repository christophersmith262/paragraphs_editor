/**
 * @file
 * Provides Drupal API integrations for paragraphs_ckeditor.
 */

(function ($, window, Drupal, drupalSettings) {

  /**
   * Attaches the AJAX behavior to setup paragraphs ckeditor instances.
   *
   * @type {Drupal~behavior}
   *
   * @prop {Drupal~behaviorAttach} attach
   *   Attaches ajaxView functionality to relevant elements.
   */
  Drupal.behaviors.paragraphs_ckeditor = {
    attach: function(context) {
      $('.paragraphs-ckeditor', context).paragraphsCKEditor();
    }
  };

  /**
   * Command to process response data from paragraphs ckeditor commands.
   *
   * @param {Drupal.Ajax} [ajax]
   *   {@link Drupal.Ajax} object created by {@link Drupal.ajax}.
   * @param {object} response
   *   The response from the Ajax request.
   * @param {string} response.id
   *   The model id for the command that was used.
   * @param {string} response.selector
   *   The id of the paragraphs ckeditor element associated with the command
   *   queue.
   * @param {number} [status]
   *   The XMLHttpRequest status.
   */
  Drupal.AjaxCommands.prototype.paragraphs_ckeditor_data = function(ajax, response, status){
    $('#' + response.selector).paragraphsCKEditor('process-command-response', response);
  }

  /**
   * Theme function for generating paragraphs ckeditor previews.
   *
   * @return {string}
   *   A string representing a DOM fragment.
   */
  Drupal.theme.paragraphsCKEditorPreview = function(markup) {
    return '<div style="background:red">' + markup + '</div>';
  }

  /**
   * {@namespace}
   */
  Drupal.paragraphs_ckeditor = {};

})(jQuery, window, Drupal, drupalSettings);
