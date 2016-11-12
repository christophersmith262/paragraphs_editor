<?php


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
  protected $embedTemplate;

  public function __construct(array $configuration, $plugin_id, $plugin_definition, EntityTypeManager $entity_type_manager, EmbedCodeProcessorInterface $embed_code_prcoessor) {
    parent::__construct($configuration, $plugin_id, $plugin_definition);
    $this->storage = $entity_type_manager->getStorage('paragraph');
    $this->viewBuilder = $entity_type_manager->getViewBuilder();
    $this->embedCodeProcessor = $embed_code_processor;
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
      $container->get('')
    );
  }

  /**
   * {@inheritdoc}
   */
  public function preprocess($text, $langcode) {
    return $this->embedCodeProcessor->process($text, $this);
  }

  /**
   * {@inheritdoc}
   */
  public function process($text, $langcode) {
    return preg_replace_callback('/\[' . $this->tokenName . ':([^\])]\]', [$this, 'replaceEmbedCode'], $text);
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
    $entity = $this->storage->load($paragraph_uuid);
    if ($entity) {
      return $this->viewBuilder->view($entity);
    }
    else {
      return '';
    }
  }
}
