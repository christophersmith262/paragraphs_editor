<?php

namespace Drupal\paragraphs_editor\EditorFieldValue;

use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Field\FieldItemListInterface;
use Drupal\paragraphs_editor\EditBuffer\EditBufferInterface;

class FieldValueManager implements FieldValueManagerInterface {
  //use ParagraphsEditorAwarePluginTrait; 

  protected $storage;
  protected $embedCodeProcessor;

  public function __construct(EntityTypeManagerInterface $entity_type_manager, EmbedCodeProcessorInterface $embed_code_processor) {
    $this->storage = $entity_type_manager->getStorage('paragraph');
    $this->embedCodeProcessor = $embed_code_processor;
  }

  public function wrap(FieldItemListInterface $items, array $settings) {
    $markup = '';
    $entities = array();

    // Build a list of refrenced entities and filter out the text entities.
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

    // If there is no text entity we need to create one.
    if (!$text_entity) {
      $text_entity = $this->storage->create(array(
        'type' => $settings['text_bundle'],
      ));
      $text_entity->{$settings['text_field']}->format = $settings['filter_format'];
    }

    // Reset the text entity markup in case we merged multiple text entities.
    $text_entity->{$settings['text_field']}->value = $markup;

    $children = array();
    /*foreach ($entities as $entity) {
      foreach ($entity->getFields(FALSE) as $field_definition) {
        if (self::isApplicable($field_definition)) {
          $children[$entity->uuid()] = $this->wrap($entity->{$field_definition->getName()}, $settings);
        }
      }
    }*/

    return new FieldValueWrapper($text_entity, $entities, $children, $settings);
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
