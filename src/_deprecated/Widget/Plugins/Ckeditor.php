<?php
/**
 * Provides a CKEDITOR widget for editing paragraphs fields.
 */

namespace Drupal\paragraphs_ckeditor\Widget\Plugins;

use \Drupal\paragraphs_extra\Widget\WidgetBase;
use \Drupal\paragraphs_extra\Widget\State;

/**
 * A class for exposing a CKEDITOR wysiwyg on top of paragraphs.
 */
class Ckeditor extends WidgetBase {

  public function init(array &$field_element) {
    $field_element['#attached']['js'][] = drupal_get_path('module', 'paragraphs_ckeditor') . '/js/EmbedModal.js';

    ctools_include('ajax');
    ctools_include('modal');
    ctools_modal_add_js();
  }

  /**
   * {@inheritdoc}
   */
  public function element(array &$element, array $paragraphs) {

    // Attach a wysiwyg form element.
    $element['wysiwyg'] = array(
      '#type' => 'text_format',
      '#default_value' => $this->paragraphsToMarkup($paragraphs),
      '#format' => 'filtered_html',
      '#attributes' => array(
        'class' => array('paragraphs-extra-wysiwyg'),
      ),
    );

    $classes = array(
      'element-invisible',
      _paragraphs_extra_class('ckeditor', 'modal-trigger'),
    );

    ctools_include('ajax');
    ctools_include('modal');

    $element['modal_trigger'] = array(
      '#markup' => ctools_modal_text_button(
        t('Embed Paragraph'),
        'admin/paragraphs-ckeditor/nojs/embed-form/',
        t('Embed Paragraph'),
        implode(' ', $classes)
      ),
    );
  }

  public function submit(State $state, array $element, array $values) {
    $markup = $values['wysiwyg']['value'];
    if (empty($markup)) {
      $markup = '<p></p>';
    }
    $reader = new \Drupal\paragraphs_ckeditor\Ckeditor\Reader($markup, $this->field_element, $this->form_state);
    $reader->readInto($state);
  }

  public function setState(State $state) {
    return array(
      'wysiwyg' => array(
        'value' => $this->paragraphsToMarkup($state->getItems(), 'entity'),
        'format' => 'filtered_html',
      ),
    );
  }

  protected function paragraphsToMarkup(array $items, $key = NULL) {
    $markup = '';
    foreach ($items as $delta => $item) {
      if (is_numeric($delta)) {
        // Resolve the entity to be rendered.
        $entity = NULL;
        if (isset($key)) {
          if (isset($item[$key])) {
            $entity = $item[$key];
          }
        }
        else {
          $entity = $item;
        }

        // Add the rendered entity to the markup.
        $removed = isset($entity->removed) ? $entity->removed : FALSE;
        $removed_confirmed = isset($entity->removed_confirmed) ? $entity->removed_confirmed : FALSE;
        $is_removed = $removed && $removed_confirmed;
        if ($entity && !$is_removed ) {
          if ($entity->bundle == 'text') {
            $wrapper = entity_metadata_wrapper('paragraphs_item', $entity);
            if ($wrapper) {
              $markup .= $wrapper->field_text->value()['value'];
            }
          }
          else {
            $output = paragraphs_ckeditor_paragraphs_entity_embed_paragraph($entity, $this->form_state);
            $markup .= drupal_render($output);
          }
        }
      }
    }
    return $markup;
  }

}
