/**
 * @file
 * Provides Drupal API integrations for paragraphs_editor.
 */

(function ($, window, Drupal, drupalSettings) {

  Drupal.behaviors.paragraphs_editor_bundleselector = {
    attach: function(context) {
      $('.paragraphs-editor-bundle-selector-search', context).each(function() {
        var $container = $(this);
        var $input = $container.find('.paragraphs-editor-bundle-selector-search__input');
        var $submit = $container.find('.paragraphs-editor-bundle-selector-search__submit');

        $input.keyup(function (evt) {
          $submit.mousedown();
        }).blur(function () {
          $(this).trigger('focus');
        });
      });
    }
  }

})(jQuery, window, Drupal, drupalSettings);
