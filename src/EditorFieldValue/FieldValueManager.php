<?php

namespace Drupal\paragraphs_ckeditor\EditorFieldValue;

use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Field\FieldItemListInterface;
use Drupal\paragraphs_ckeditor\EditBuffer\EditBufferInterface;

class FieldValueManager implements FieldValueManagerInterface {

  protected $storage;
  protected $embedCodeProcessor;

  public function __construct(EntityTypeManagerInterface $entity_type_manager, EmbedCodeProcessorInterface $embed_code_processor) {
    $this->storage = $entity_type_manager->getStorage('paragraph');
    $this->embedCodeProcessor = $embed_code_processor;
  }

  public function wrap(FieldItemListInterface $items, array $settings) {
    $markup = '';
    $entities = array();
    $text_entity = NULL;
    foreach ($items as $item) {
      $paragraph = $item->entity;
      if ($paragraph->bundle() == $settings['text_bundle']) {
        $markup .= $paragraph->{$settings['text_field']}->value;
        if (!$text_entity) {
          $text_entity = $paragraph;
        }
      }
      else {
        $entities[$paragraph->uuid()] = $paragraph;
      }
    }
    if (!$text_entity) {
      $text_entity = $this->storage->create(array(
        'type' => $settings['text_bundle'],
      ));
      $text_entity->{$settings['text_field']}->format = $settings['filter_format'];
    }
    $text_entity->{$settings['text_field']}->value = $markup;
    return new FieldValueWrapper($text_entity, $entities, $settings);
  }

  public function update(FieldValueWrapperInterface $field_value_wrapper, EditBufferInterface $edit_buffer, $markup, $format) {
    $embed_codes = new EmbedCodeAccountant($edit_buffer);
    $this->embedCodeProcessor->process($markup, $embed_codes);
    $field_value_wrapper->setEntities($embed_codes->getEntities());
    $field_value_wrapper->setMarkup($markup);
    $field_value_wrapper->setFormat($format);
    return $field_value_wrapper;
  }
}
