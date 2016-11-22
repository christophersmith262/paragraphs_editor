/**
 * @file
 * Provides Drupal API integrations for paragraphs_editor.
 */

(function ($, window, Drupal, drupalSettings) {

  Drupal.behaviors.paragraphs_editor_toolbox = {
    attach: function(context) {
      $('.cke_contents', context).once()
        .addClass('paragraphs-editor-toolbox-processed')
        .after($(Drupal.theme.paragraphsCKEditorToolbox()));
      $('.paragraphs-editor-toolbox-cards__card:odd').addClass('odd');
    }
  };


  Drupal.theme.paragraphsCKEditorToolbox = function() {
    return '<div class="paragraphs-editor-toolbox">'
      +      '<h4 class="paragraphs-editor-toolbox-header">Pattern Library</h4>'
      +      '<input type="text" value="search..." class="paragraphs-editor-toolbox-search">'
      +      '<ul class="paragraphs-editor-toolbox-cards">'
      +        '<li class="paragraphs-editor-toolbox-cards__card" draggable="true">Image</li>'
      +        '<li class="paragraphs-editor-toolbox-cards__card" draggable="true">Slideshow</li>'
      +        '<li class="paragraphs-editor-toolbox-cards__card" draggable="true">Accordion</li>'
      +        '<li class="paragraphs-editor-toolbox-cards__card" draggable="true">Hero Image</li>'
      +      '</ul>'
      +    '</div>';
  }

})(jQuery, window, Drupal, drupalSettings);
