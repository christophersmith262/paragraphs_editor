<?php

namespace Drupal\paragraphs_editor\Plugin\dom_processor\data_processor;

use Drupal\dom_processor\DomProcessor\DomProcessorResultInterface;
use Drupal\dom_processor\DomProcessor\SemanticDataInterface;
use Drupal\dom_processor\Plugin\dom_processor\DataProcessorInterface;
use Drupal\paragraphs_editor\Plugin\dom_processor\ParagraphsEditorDomProcessorPluginTrait;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * @DomProcessorDataProcessor(
 *   id = "paragraphs_editor_extractor",
 *   label = "Paragraphs Editor Extractor"
 * )
 */
class ParagraphsEditorExtractor implements DataProcessorInterface, ContainerFactoryPluginInterface {
  use ParagraphsEditorDomProcessorPluginTrait;

  public function __construct($field_value_manager, array $elements) {
    $this->initializeParagraphsEditorDomProcessorPlugin($field_value_manager, $elements);
  }

  /**
   * {@inheritdoc}
   */
  static public function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
    return new static(
      $container->get('paragraphs_editor.field_value.manager'),
      $container->getParameter('paragraphs_editor.field_value.elements')
    );
  }

  /**
   * {@inheritdoc}
   */
  public function process(SemanticDataInterface $data, DomProcessorResultInterface $result) {

    if ($this->is($data, 'widget')) {
      $entity = $data->get('paragraph.entity');

      $wrapper = $data->get('field.wrapper');
      if ($wrapper) {
        $wrapper->addReferencedEntity($entity);
      }

      if ($data->node()->hasChildNodes()) {
        foreach ($data->node()->childNodes as $child_node) {
          $data->node()->removeChild($child_node);
        }
      }

      $data->node()->removeAttribute($this->getAttributeName('widget', '<context>'));
    }
    else if ($this->is($data, 'field') || $data->isRoot()) {
      $items = $data->get('field.items');
      $wrapper = $data->get('field.wrapper');
      if ($wrapper) {
        $wrapper->setMarkup($data->getInnerHTML());
        $this->fieldValueManager->updateItems($items, $wrapper);
      }
    }

    return $result;
  }
}

