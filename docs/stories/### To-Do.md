### To-Do

1. Criar Briefing da Nova Implementação.
2. Criar Frontend.
3. Criar Backend.

### Briefing

Problema: Nossos gestores de tráfego, precisam de clareza na hora de otimizar a campanha. Para isso, precisam compreender o seu 
ROI geral. O problema é que as plataformas de tráfego não exibem com clareza o ROI, pois só mostram os valores das vendas realizadas no frontend.
e não no Backend - como um upsell.

Logo, para realizar as otimizações, atualmente é necessário que o gestor de tráfego utilize a AI para analizar o tráfego, cruzar com a UTM e verificar de qual campanha veio qual venda.

Isso é possível pois atualmente utilizamos a lastlink, cuja:

1. Exibe os dados de venda de cada produto ( front & back ), além dos dados de cada cliente.
2. Exibe a UTM de cada venda realizada quando disponível.

Atualmente, não há clareza se a UTM é exibida nas vendas do UPSELL, logo nós precisaremos fazer um cruzamento de dados ( Como: Cruzar o email de cada venda - front & back, então ver a UTM do respectivo email no front ), para descobrir a origem do upsell.

No fim, o objetivo final é uma tabela em ordem crescente com filtro de dias, contendo as campanhas com o maior número de ROI ( vendas FRONT & UPSELL ), para que os gestores consigam realizar essa otimização com precisão.

Atualmente, a lastlink exibe um webhook para cada produto, assim, também pode ser necessário ( em uma feature pós MVP )
 
Permitir a configuração de "campanha", ligando o webhook do front - upsell, afim de ter uma estrutura agnóstica e que consiga configurar múltiplas campanhas, ao mesmo tempo.



