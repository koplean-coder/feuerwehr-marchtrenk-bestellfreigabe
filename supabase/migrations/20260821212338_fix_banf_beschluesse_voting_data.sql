-- Korrigiere alle BANF-Beschlüsse im Register mit den echten Abstimmungsdaten
WITH vote_counts AS (
  SELECT 
    ov.order_id,
    COUNT(*) FILTER (WHERE ov.vote = 'approve') as votes_for,
    COUNT(*) FILTER (WHERE ov.vote = 'reject') as votes_against
  FROM order_votes ov
  GROUP BY ov.order_id
)
UPDATE beschluss_register br
SET 
  abstimmung_ja = COALESCE(vc.votes_for, 0),
  abstimmung_nein = COALESCE(vc.votes_against, 0),
  status = CASE 
    WHEN o.voting_result = 'approved' 
      OR o.kommandomitglied_approved_at IS NOT NULL 
    THEN 'genehmigt'
    WHEN o.voting_result = 'rejected'
    THEN 'abgelehnt'
    ELSE br.status
  END
FROM orders o
LEFT JOIN vote_counts vc ON vc.order_id = o.id
WHERE br.order_id = o.id
  AND br.typ = 'banf';