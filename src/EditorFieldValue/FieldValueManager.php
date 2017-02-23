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

    /*$node = new ParseTreeNode($items->getFieldDefinition());
    $node->attachData('field_value_wrapper', new FieldValueWrapper($text_entity, $entities, $settings));
    $this->attachChildren($node, $entities, $settings);
    return $node;*/

    return new FieldValueWrapper($text_entity, $entities, [], $settings);
  }

  public function update(FieldValueWrapperInterface $field_value_wrapper, EditBufferInterface $edit_buffer, $markup, $format) {
    $embed_codes = new EmbedCodeAccountant($edit_buffer);
    $this->embedCodeProcessor->process($markup, $embed_codes);
    $field_value_wrapper->setEntities($embed_codes->getEntities());
    $field_value_wrapper->setMarkup($markup);
    $field_value_wrapper->setFormat($format);
    return $field_value_wrapper;
  }

  protected function attachChildren(ParseTreeNodeInterface $node, array $entities, array $settings) {
    foreach ($entities as $entity) {
      foreach ($entity->getFields(FALSE) as $field_definition) {
        if ($field_definition->isParagraph()) {
          $child_items = $entity->{$field_definition->getName()};
          if (self::isApplicable($field_definition)) {
            $child = $this->wrap($child_items, $settings);
          }
          else {
            $child_entities = [];
            foreach ($child_items as $item) {
              $paragraph = $item->entity;
              $child_entities[$paragraph->uuid()] = $paragraph;
            }
            $child = new ParseTreeNode($child_items->getFieldDefinition());
            $this->attachChildren($child, $child_entities, $settings);
          }
          $node->addChild($child);
        }
      }
    }
  }
}

/*class ParagraphTreeNode {

  public function __construct(FieldDefinitionInterface $field_definition) {
  }

  public function addChildren(array $children) {
  }

  public function addChild(ComponentTreeNodeInterface $child) {
  }

  public function setParent(ComponentTreeNodeInterface $parent) {
  }

  public function attachData($name, $value) {
  }

  public function getData($name) {
  }
}*/
