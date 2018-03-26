<?php

namespace Drupal\paragraphs_editor\Plugin\dom_processor\data_processor;

use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\dom_processor\DomProcessor\SemanticDataInterface;
use Drupal\dom_processor\DomProcessor\DomProcessorResultInterface;
use Drupal\dom_processor\Plugin\dom_processor\DataProcessorInterface;
use Drupal\paragraphs_editor\ParagraphsEditorElements;
use Drupal\paragraphs_editor\ParagraphsEditorElementTrait;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * A DOM processor plugin for decorating widgets with a context hint.
 *
 * @DomProcessorDataProcessor(
 *   id = "paragraphs_editor_decorator",
 *   label = "Paragraphs Editor Decorator"
 * )
 */
class ParagraphsEditorDecorator implements DataProcessorInterface, ContainerFactoryPluginInterface {
  use ParagraphsEditorElementTrait;

  /**
   * Creates a widget decorator plugin.
   *
   * @param \Drupal\paragraphs_editor\ParagraphsEditorElements $elements
   *   The elements service to initialize the element trait.
   */
  public function __construct(ParagraphsEditorElements $elements) {
    $this->initializeParagraphsEditorElementTrait($elements);
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
    return new static(
      $container->get('paragraphs_editor.elements')
    );
  }

  /**
   * {@inheritdoc}
   */
  public function process(SemanticDataInterface $data, DomProcessorResultInterface $result) {
    if ($data->is($this->getSelector('widget'))) {
      $this->setAttribute($data->node(), 'widget', '<context>', $data->get('context_id'));
    }
    return $result;
  }

}
