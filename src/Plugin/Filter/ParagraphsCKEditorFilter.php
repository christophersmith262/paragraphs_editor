<?php

namespace Drupal\paragraphs_ckeditor\Plugin\Filter;

use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\filter\FilterProcessResult;
use Drupal\filter\Plugin\FilterBase;
use Drupal\paragraphs_ckeditor\EditorFieldValue\EmbedCodeProcessorInterface;
use Drupal\paragraphs_ckeditor\EditorFieldValue\EmbedCodeVisitorInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * A filter to transform paragraph embed codes into rendered entities.
 *
 * @Filter(
 *   id = "paragraphs_ckeditor_embed_formatter",
 *   title = @Translation("Render embedded paragraphs"),
 *   description = @Translation("Converts paragraphs-ckeditor embed codes to rendered entities"),
 *   type = Drupal\filter\Plugin\FilterInterface::TYPE_TRANSFORM_IRREVERSIBLE
 * )
 */
class ParagraphsCKEditorFilter extends FilterBase implements EmbedCodeVisitorInterface, ContainerFactoryPluginInterface {

  protected $storage;
  protected $viewBuilder;
  protected $embedCodeProcessor;
  protected $renderer;
  protected $tokenName;

  public function __construct(array $configuration, $plugin_id, $plugin_definition, EntityTypeManagerInterface $entity_type_manager, EmbedCodeProcessorInterface $embed_code_processor, $renderer) {
    parent::__construct($configuration, $plugin_id, $plugin_definition);
    $this->storage = $entity_type_manager->getStorage('paragraph');
    $this->viewBuilder = $entity_type_manager->getViewBuilder('paragraph');
    $this->embedCodeProcessor = $embed_code_processor;
    $this->renderer = $renderer;
    $this->tokenName = 'paragraphs-ckeditor-paragraph-embed-token';
  }

  /**
   * {@inheritdoc}
   */
  static public function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
    return new static(
      $configuration,
      $plugin_id,
      $plugin_definition,
      $container->get('entity.manager'),
      $container->get('paragraphs_ckeditor.field_value.embed_code_processor'),
      $container->get('renderer')
    );
  }

  /**
   * {@inheritdoc}
   */
  public function prepare($text, $langcode) {
    return $this->embedCodeProcessor->process($text, $this);
  }

  /**
   * {@inheritdoc}
   */
  public function process($text, $langcode) {
    $text = preg_replace_callback('/\[' . $this->tokenName . ':([^\]]+)\]/', [$this, 'replaceEmbedCode'], $text);
    $result = new FilterProcessResult($text);
    return $result;
  }

  /**
   * {@inheritdoc}
   */
  public function visit(\DOMNode $node, $paragraph_uuid, $context_string) {
    $token = $node->ownerDocument->createTextNode("[{$this->tokenName}:$paragraph_uuid]");
    $node->parentNode->replaceChild($token, $node);
  }

  public function replaceEmbedCode(array $matches) {
    $paragraph_uuid = $matches[1];
    $entity = $this->storage->loadByProperties(array(
      'uuid' => $paragraph_uuid,
    ));
    if ($entity) {
      $build = $this->viewBuilder->view(reset($entity));
      return $this->renderer->render($build);
    }
    else {
      return '';
    }
  }
}
