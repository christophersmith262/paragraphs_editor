<?php

namespace Drupal\paragraphs_editor\Plugin\dom_processor\data_processor;

use Drupal\dom_processor\DomProcessor\SemanticDataInterface;
use Drupal\dom_processor\Plugin\dom_processor\DataProcessorInterface;

/**
 * @DomProcessorDataProcessor(
 *   id = "paragraphs_editor_extractor",
 *   label = "Paragraphs Editor Extractor"
 * )
 */
class ParagraphsEditorParagraphExtractor implements DataProcessorInterface {

  public function process(SemanticDataInterface $data) {
    $field_value_wrapper = $data->get('field.wrapper');

    if ($field_value_wrapper) {
      $field_value_wrapper->flagUpdate();
    }

    if ($data->type() == 'paragraph') {
      $field_value_wrapper->addChild($data->get('paragraph.entity'));
      if ($data->node()->hasChildNodes()) {
        foreach ($data->node()->childNodes as $child_node) {
          $data->node()->removeChild($child_node);
        }
      }
    }
    else if ($data->type() == 'field') {
      $field_value_wrapper->setMarkup($data->innerHTML());
    }
  }
}

